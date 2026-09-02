import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Tag";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified, verificationLabel, type AuthUser } from "@/features/auth/types";
import type { CountrySummary, ProfileField } from "@/features/auth/types";
import {
  formatBytes,
  groupProfileSections,
  useOwnProfile,
  viewProfileField,
} from "@/features/me/ownProfile";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

const EDIT_TO = "/app/profile/edit";

export function ProfilePage() {
  const { user } = useAuth();
  const { profile, countries, error, loading } = useOwnProfile();
  const orgName = profile?.title || user?.displayName || "Profil";
  const displayName = isBusiness(user) ? orgName : user?.displayName || orgName;
  const location = [profile?.city, user?.country?.name].filter(Boolean).join(" · ");
  const mobility = [
    profile?.relocate ? "Prêt à déménager" : null,
    profile?.international ? "Disponible pour mission internationale" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const sections = profile ? groupProfileSections(profile.fields) : [];
  const subtitle = isBusiness(user)
    ? [profile?.orgType, user?.role?.label].filter(Boolean).join(" · ")
    : profile?.title || user?.role?.label || "Membre";

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{profileTitle(user)}</h1>
          <div className="sub">Données enregistrées sur votre compte</div>
        </div>
        {isSuperAdmin(user) ? null : (
          <div className="head-actions">
            <Button variant="primary" to={EDIT_TO}>
              Modifier le profil
            </Button>
          </div>
        )}
      </div>

      {error ? <p className="empty-hint">{error}</p> : null}
      {loading ? <p className="empty-hint">Chargement du profil…</p> : null}

      <div className="profile-banner">
        <ProfileAvatar uploadId={profile?.logoUploadId ?? user?.avatarUploadId} name={displayName} size={76} />
        <div>
          <div className="pn">{displayName}</div>
          <div className="pt">{subtitle}</div>
          <div className="ploc">{[location, mobility].filter(Boolean).join(" · ") || "—"}</div>
          <div className="tag-row">
            <Badge variant={isVerified(user) ? "default" : "pending"}>{verificationLabel(user)}</Badge>
            {(profile?.specialties ?? []).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </div>

      <Panel title="Compte">
        <div className="info-grid">
          <InfoCell label="E-mail" value={user?.email} />
          <InfoCell label="Rôle" value={user?.role?.label} />
          <InfoCell label="Pays du compte" value={user?.country ? `${user.country.flagEmoji} ${user.country.name}` : null} />
        </div>
      </Panel>

      {sections.map((section) => (
        <Panel key={section.key} title={section.label} actionLabel={isSuperAdmin(user) ? undefined : "Modifier"} actionTo={isSuperAdmin(user) ? undefined : EDIT_TO}>
          <div className="info-grid">
            {section.fields.map((field) => (
              <FieldCell key={field.fieldKey} field={field} raw={profile?.values[field.fieldKey]} countries={countries} />
            ))}
          </div>
        </Panel>
      ))}
    </section>
  );
}

function FieldCell({
  field,
  raw,
  countries,
}: {
  field: ProfileField;
  raw?: string;
  countries: CountrySummary[];
}) {
  const view = viewProfileField(field, raw, countries);
  if (view.kind === "empty") {
    return <InfoCell label={field.label} value={null} />;
  }
  if (view.kind === "photo") {
    return (
      <div className="info-cell span-3">
        <div className="k">{field.label}</div>
        <div className="v v-photo">
          <ProfileAvatar uploadId={view.id} name={field.label} size={64} />
        </div>
      </div>
    );
  }
  if (view.kind === "files") {
    return (
      <div className="info-cell span-3">
        <div className="k">{field.label}</div>
        <ul className="profile-files">
          {view.files.map((file) => (
            <li key={file.id}>
              {file.name}
              {file.size ? ` · ${formatBytes(file.size)}` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (view.kind === "tags") {
    return (
      <div className="info-cell span-3">
        <div className="k">{field.label}</div>
        <div className="tag-row">
          {view.items.map((item) => (
            <Tag key={item}>{item}</Tag>
          ))}
        </div>
      </div>
    );
  }
  if (view.kind === "rows") {
    return (
      <div className="info-cell span-3">
        <div className="k">{field.label}</div>
        {view.rows.map((row, index) => (
          <div className="profile-row" key={`${field.fieldKey}-${index}`}>
            {row.map((entry) => (
              <span key={entry.label}>
                <strong>{entry.label} :</strong> {entry.value}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return <InfoCell label={field.label} value={view.value} wide={view.wide} />;
}

function InfoCell({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`info-cell${wide ? " span-3" : ""}`}>
      <div className="k">{label}</div>
      <div className="v">{value || "—"}</div>
    </div>
  );
}

function profileTitle(user: AuthUser | null) {
  if (isSuperAdmin(user)) {
    return "Mon profil";
  }
  if (isBusiness(user)) {
    return "Profil organisation";
  }
  return "Profil professionnel";
}
