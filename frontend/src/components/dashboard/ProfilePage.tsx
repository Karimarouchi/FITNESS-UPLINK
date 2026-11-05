import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Tag";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified, verificationLabel, type AuthUser } from "@/features/auth/types";
import { useBilling } from "@/features/billing/useBilling";
import type { CountrySummary, ProfileField } from "@/features/auth/types";
import { fetchUploadBlob } from "@/features/onboarding/api";
import {
  formatBytes,
  groupProfileSections,
  useOwnProfile,
  viewProfileField,
} from "@/features/me/ownProfile";
import type { FileRef } from "@/features/talent/api";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { usesWorkspaceShell } from "@/components/layout/shell/shellNav";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import { SkeletonRows } from "@/components/ui/Skeleton";

const EDIT_TO = "/app/profile/edit";

export function ProfilePage() {
  const { user } = useAuth();
  const { profile, countries, error, loading } = useOwnProfile();
  const premium = usesWorkspaceShell(user);
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
    <section className={premium ? "bo-dash bo-users bo-bm bo-pf" : undefined}>
      {premium ? (
        <header className="bo-dash-head">
          <div>
            <h1>{profileTitle(user)}</h1>
            <p>Données enregistrées sur votre compte</p>
          </div>
          {isSuperAdmin(user) ? null : (
            <Link to={EDIT_TO} className="bm-btn">
              Modifier le profil
            </Link>
          )}
        </header>
      ) : (
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
      )}

      {error ? (
        <p className={premium ? "bo-dash-error" : "empty-hint"} role={premium ? "alert" : undefined}>
          {error}
        </p>
      ) : null}
      {loading ? <SkeletonRows rows={3} label="Chargement du profil…" /> : null}

      <div className={premium ? "bo-dash-card pf-banner" : "profile-banner"}>
        <ProfileAvatar uploadId={profile?.logoUploadId ?? user?.avatarUploadId} name={displayName} size={76} />
        <div>
          <div className="pn">{displayName}</div>
          <div className="pt">{subtitle}</div>
          <div className="ploc">{[location, mobility].filter(Boolean).join(" · ") || "—"}</div>
          <div className="tag-row">
            {premium ? (
              <span className={`bo-users-status ${isVerified(user) ? "is-success" : "is-warn"}`}>{verificationLabel(user)}</span>
            ) : (
              <Badge variant={isVerified(user) ? "default" : "pending"}>{verificationLabel(user)}</Badge>
            )}
            {(profile?.specialties ?? []).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </div>

      <Sec premium={premium} title="Compte">
        <InfoCell premium={premium} label="E-mail" value={user?.email} />
        <InfoCell premium={premium} label="Rôle" value={user?.role?.label} />
        <InfoCell premium={premium} label="Pays du compte" value={user?.country ? `${user.country.flagEmoji} ${user.country.name}` : null} />
      </Sec>

      {user && !isSuperAdmin(user) ? <OfferPanel premium={premium} /> : null}

      {sections.map((section) => (
        <Sec
          key={section.key}
          premium={premium}
          title={section.label}
          actionLabel={isSuperAdmin(user) ? undefined : "Modifier"}
          actionTo={isSuperAdmin(user) ? undefined : EDIT_TO}
        >
          {section.fields.map((field) => (
            <FieldCell key={field.fieldKey} premium={premium} field={field} raw={profile?.values[field.fieldKey]} countries={countries} />
          ))}
        </Sec>
      ))}
    </section>
  );
}

/** A profile section: the legacy Panel + info grid, or the Premium card with a tile grid. */
function Sec({
  premium,
  title,
  actionLabel,
  actionTo,
  children,
}: {
  premium: boolean;
  title: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
}) {
  if (!premium) {
    return (
      <Panel title={title} actionLabel={actionLabel} actionTo={actionTo}>
        <div className="info-grid">{children}</div>
      </Panel>
    );
  }
  return (
    <section className="bo-dash-card pf-card">
      <div className="pf-head">
        <h2>{title}</h2>
        {actionLabel && actionTo ? (
          <Link className="bo-dash-link" to={actionTo}>
            {actionLabel} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="pf-grid">{children}</div>
    </section>
  );
}

function OfferPanel({ premium }: { premium: boolean }) {
  const billing = useBilling();
  const sub = billing?.subscription;
  return (
    <Sec premium={premium} title="Offre" actionLabel="Gérer" actionTo="/app/billing">
      <InfoCell premium={premium} label="Offre actuelle" value={sub?.planName ?? "Aucune offre"} />
      <InfoCell premium={premium} label="Statut" value={sub?.status ?? "—"} />
      <InfoCell
        premium={premium}
        label="Devise"
        value={sub ? `${sub.currency} · ${sub.interval === "YEARLY" ? "Annuel" : "Mensuel"}` : "—"}
      />
    </Sec>
  );
}

function FieldCell({
  premium,
  field,
  raw,
  countries,
}: {
  premium: boolean;
  field: ProfileField;
  raw?: string;
  countries: CountrySummary[];
}) {
  const view = viewProfileField(field, raw, countries);
  if (view.kind === "empty") {
    return <InfoCell premium={premium} label={field.label} value={null} />;
  }
  if (view.kind === "photo") {
    return (
      <div className={premium ? "pf-cell is-wide" : "info-cell span-3"}>
        <div className="k">{field.label}</div>
        <div className="v v-photo">
          <ProfileAvatar uploadId={view.id} name={field.label} size={64} />
        </div>
      </div>
    );
  }
  if (view.kind === "files") {
    const videos = view.files.filter((file) => file.contentType?.startsWith("video/"));
    const documents = view.files.filter((file) => !file.contentType?.startsWith("video/"));
    return (
      <div className={premium ? "pf-cell is-wide" : "info-cell span-3"}>
        <div className="k">{field.label}</div>
        {videos.length > 0 ? (
          <div className="video-grid">
            {videos.map((file) => (
              <ProfileVideoCard key={file.id} file={file} />
            ))}
          </div>
        ) : null}
        {documents.length > 0 ? (
          <ul className="profile-files">
            {documents.map((file) => (
              <ProfileFileRow key={file.id} file={file} />
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  if (view.kind === "tags") {
    return (
      <div className={premium ? "pf-cell is-wide" : "info-cell span-3"}>
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
      <div className={premium ? "pf-cell is-wide" : "info-cell span-3"}>
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
  return <InfoCell premium={premium} label={field.label} value={view.value} wide={view.wide} />;
}

function InfoCell({ premium, label, value, wide }: { premium: boolean; label: string; value?: string | null; wide?: boolean }) {
  if (premium) {
    return (
      <div className={`pf-cell${wide ? " is-wide" : ""}`}>
        <div className="k">{label}</div>
        <div className="v">{value || "—"}</div>
      </div>
    );
  }
  return (
    <div className={`info-cell${wide ? " span-3" : ""}`}>
      <div className="k">{label}</div>
      <div className="v">{value || "—"}</div>
    </div>
  );
}

function ProfileFileRow({ file }: { file: FileRef }) {
  async function open() {
    const blob = await fetchUploadBlob(file.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <li>
      <button className="btn-mini" type="button" onClick={() => void open()}>
        {file.name}
        {file.size ? ` · ${formatBytes(file.size)}` : ""}
      </button>
    </li>
  );
}

function ProfileVideoCard({ file }: { file: FileRef }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetchUploadBlob(file.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.id]);

  return (
    <div className="video-card">
      {src ? <video src={src} controls preload="metadata" /> : <div className="play">▶</div>}
      <div className="cap">{file.name}</div>
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
