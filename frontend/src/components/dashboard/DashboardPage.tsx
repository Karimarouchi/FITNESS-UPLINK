import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import {
  isBusiness,
  isCandidate,
  isSuperAdmin,
  isVerified,
  verificationLabel,
} from "@/features/auth/types";
import { fetchContracts } from "@/features/contracts/api";
import { fetchJobOffers } from "@/features/jobs/api";
import { useOwnProfile } from "@/features/me/ownProfile";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import {
  fetchFavorites,
  fetchRecruitments,
  opportunityLabel,
  pipelineTone,
  statusLabel,
  type Recruitment,
} from "@/features/recruitment/api";

export function DashboardPage() {
  const { user } = useAuth();
  if (isSuperAdmin(user)) {
    return <AdminDashboard />;
  }
  if (isBusiness(user)) {
    return <BusinessDashboard />;
  }
  if (isCandidate(user)) {
    return <CandidateDashboard />;
  }
  return <MemberDashboard />;
}

function CandidateDashboard() {
  const { user } = useAuth();
  const { profile } = useOwnProfile();
  const [rows, setRows] = useState<Recruitment[]>([]);
  const [contracts, setContracts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRecruitments(), fetchContracts()])
      .then(([recruitments, items]) => {
        setRows(recruitments);
        setContracts(items.length);
      })
      .catch(() => setError("Impossible de charger votre tableau de bord."));
  }, []);

  const active = rows.filter((row) => !["REJECTED", "ARCHIVED", "HIRED"].includes(row.status));
  const docs = [profile?.cv, ...(profile?.diplomas ?? []), ...(profile?.certifications ?? []), ...(profile?.videos ?? [])].filter(Boolean).length;
  const docsExpected = 4;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <Badge variant={isVerified(user) ? "default" : user?.verificationStatus === "rejected" ? "warn" : "pending"}>
            {verificationLabel(user)}
          </Badge>
        </div>
      </div>
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="cards-row">
        <KpiCard label="Candidatures actives" value={String(active.length)} delta={`${rows.length} au total`} />
        <KpiCard label="Contrats" value={String(contracts)} delta="Depuis la base" />
        <KpiCard
          label="Documents transmis"
          value={`${Math.min(docs, docsExpected)}/${docsExpected}`}
          delta={docs >= docsExpected ? "Dossier complet" : "Complétez votre profil"}
        />
        <KpiCard
          label="Disponibilité"
          value={profile?.availabilityLabel ?? "—"}
          delta={profile?.city ? `Basé à ${profile.city}` : user?.country?.name ?? ""}
        />
      </div>
      <Panel title="Candidatures en cours" actionLabel="Voir tout" actionTo="/app/applications">
        {active.length === 0 ? (
          <p className="empty-hint">Aucune candidature pour le moment.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employeur</th>
                <th>Poste</th>
                <th>Pays</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {active.slice(0, 5).map((row) => (
                <tr key={row.id}>
                  <td>{row.employer?.displayName ?? "Employeur"}</td>
                  <td>{opportunityLabel(row)}</td>
                  <td>{row.employer?.country?.name ?? row.jobOffer?.location ?? "—"}</td>
                  <td>
                    <StatusPill tone={pipelineTone(row.status)}>{statusLabel(row.status)}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </section>
  );
}

function BusinessDashboard() {
  const { user } = useAuth();
  const [pipeline, setPipeline] = useState<Recruitment[]>([]);
  const [offers, setOffers] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [contracts, setContracts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRecruitments(), fetchJobOffers(), fetchFavorites(), fetchContracts()])
      .then(([recruitments, jobOffers, favs, items]) => {
        setPipeline(recruitments);
        setOffers(jobOffers.length);
        setFavorites(favs.length);
        setContracts(items.length);
      })
      .catch(() => setError("Impossible de charger votre tableau de bord."));
  }, []);

  const open = pipeline.filter((row) => !["REJECTED", "ARCHIVED", "HIRED"].includes(row.status));

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <Badge variant={isVerified(user) ? "default" : "pending"}>{verificationLabel(user)}</Badge>
        </div>
      </div>
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="cards-row">
        <KpiCard label="Recrutements ouverts" value={String(open.length)} delta={`${pipeline.length} au total`} />
        <KpiCard label="Offres d'emploi" value={String(offers)} />
        <KpiCard label="Favoris" value={String(favorites)} />
        <KpiCard label="Contrats" value={String(contracts)} />
      </div>
      <Panel title="Pipeline récent" actionLabel="Voir tout" actionTo="/pipeline">
        {pipeline.length === 0 ? (
          <p className="empty-hint">Aucun recrutement en cours. Commencez par rechercher un talent.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Poste</th>
                <th>Pays</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.slice(0, 5).map((row) => (
                <tr key={row.id}>
                  <td>{row.candidate.displayName}</td>
                  <td>{opportunityLabel(row)}</td>
                  <td>{row.candidate.country?.name ?? "—"}</td>
                  <td>
                    <StatusPill tone={pipelineTone(row.status)}>{statusLabel(row.status)}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </section>
  );
}

function MemberDashboard() {
  const { user } = useAuth();
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <Badge variant={isVerified(user) ? "default" : "pending"}>{verificationLabel(user)}</Badge>
        </div>
      </div>
      <Panel title="Votre espace">
        <p className="empty-hint">
          Bonjour {user?.firstName}. Consultez et mettez à jour votre profil depuis le menu.
        </p>
        <p className="empty-hint">
          <Link to="/app/profile">Voir mon profil</Link>
        </p>
      </Panel>
    </section>
  );
}
