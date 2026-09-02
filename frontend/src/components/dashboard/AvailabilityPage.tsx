import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Tag";
import { useOwnProfile } from "@/features/me/ownProfile";

export function AvailabilityPage() {
  const { profile, error, loading } = useOwnProfile();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Disponibilités</h1>
          <div className="sub">Informations renseignées dans votre profil</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/app/profile/edit">
            Modifier
          </Button>
        </div>
      </div>
      {loading ? <p className="empty-hint">Chargement…</p> : null}
      {error ? <p className="empty-hint">{error}</p> : null}
      <Panel title="Disponibilité générale">
        <div className="info-grid">
          <div className="info-cell">
            <div className="k">Statut</div>
            <div className="v">{profile?.availabilityLabel || "Non renseigné"}</div>
          </div>
          <div className="info-cell">
            <div className="k">Salaire souhaité</div>
            <div className="v">{profile?.salary || "—"}</div>
          </div>
        </div>
      </Panel>
      <Panel title="Types de contrat recherchés">
        {profile?.contractTypes.length ? (
          <div className="tag-row" style={{ padding: "16px 22px 22px" }}>
            {profile.contractTypes.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </div>
        ) : (
          <p className="empty-hint">Aucun type de contrat renseigné.</p>
        )}
      </Panel>
      <Panel title="Créneaux pour cours collectifs">
        {profile?.slots.length ? (
          <div className="tag-row" style={{ padding: "16px 22px 22px" }}>
            {profile.slots.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </div>
        ) : (
          <p className="empty-hint">Aucun créneau renseigné.</p>
        )}
      </Panel>
    </section>
  );
}
