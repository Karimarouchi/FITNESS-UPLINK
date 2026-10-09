import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import {
  hasPermission,
  isSuperAdmin,
  isVerified,
  verificationLabel,
} from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchContracts } from "@/features/contracts/api";
import { fetchJobOffers } from "@/features/jobs/api";
import { useOwnProfile } from "@/features/me/ownProfile";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ModuleWorkspacePage } from "@/features/workspace/ModuleWorkspacePage";
import { SupplierDashboardPage } from "@/features/marketplace/pages/SupplierDashboardPage";
import {
  fetchFavorites,
  fetchInboxCount,
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
  if (hasPermission(user, PERMS.HIRE_PIPELINE)) {
    return <BusinessDashboard />;
  }
  if (hasPermission(user, PERMS.HIRE_APPLY)) {
    return <CandidateDashboard />;
  }
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) {
    return <ModuleWorkspacePage workspace="academy" />;
  }
  if (hasPermission(user, PERMS.MARKETPLACE_MANAGE)) {
    return <SupplierDashboardPage />;
  }
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) {
    return <ModuleWorkspacePage workspace="services" />;
  }
  if (hasPermission(user, PERMS.EVENTS_MANAGE)) {
    return <ModuleWorkspacePage workspace="events" />;
  }
  if (hasPermission(user, PERMS.CONTENT_PUBLISH)) {
    return <ModuleWorkspacePage workspace="content" />;
  }
  if (hasPermission(user, PERMS.COACHING_MANAGE)) {
    return <ModuleWorkspacePage workspace="coaching" />;
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
        <Link className="btn-outline" to="/">
          Voir le site
        </Link>
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
                    <StatusPill tone={pipelineTone(row.status)}>{statusLabel(row.status, "candidate")}</StatusPill>
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
  const [inbox, setInbox] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRecruitments(), fetchJobOffers(), fetchFavorites(), fetchContracts(), fetchInboxCount()])
      .then(([recruitments, jobOffers, favs, items, waiting]) => {
        setPipeline(recruitments);
        setOffers(jobOffers.length);
        setFavorites(favs.length);
        setContracts(items.length);
        setInbox(waiting.count);
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
        <Link className="btn-outline" to="/">
          Voir le site
        </Link>
      </div>
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="cards-row">
        <KpiCard label="Candidatures reçues" value={String(inbox)} />
        <KpiCard label="Recrutements ouverts" value={String(open.length)} delta={`${pipeline.length} au total`} />
        <KpiCard label="Offres d'emploi" value={String(offers)} />
        <KpiCard label="Favoris" value={String(favorites)} />
        <KpiCard label="Contrats" value={String(contracts)} />
      </div>
      <Panel title="Candidatures reçues" actionLabel="Ouvrir" actionTo="/applications">
        {inbox === 0 ? (
          <p className="empty-hint">Aucune candidature en attente. Les postulats apparaissent ici.</p>
        ) : (
          <p className="empty-hint">
            {inbox} dossier{inbox > 1 ? "s" : ""} à examiner.{" "}
            <Link to="/applications">Ouvrir la boîte de réception</Link>
          </p>
        )}
      </Panel>
      <Panel title="Dossiers récents" actionLabel="Voir tout" actionTo="/applications">
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

type MemberTile = { icon: string; title: string; text: string; to: string; perm?: string };

const MEMBER_TILES: MemberTile[] = [
  { icon: "person_search", title: "Trouver un coach", text: "Spécialités, avis vérifiés, réservation.", to: "/coaches", perm: PERMS.COACHING_DISCOVER },
  { icon: "event_available", title: "Mes séances", text: "Réservations, packs et paiements.", to: "/app/coaching/bookings", perm: PERMS.COACHING_DISCOVER },
  { icon: "school", title: "Académie", text: "Formations, certifications, masterclass.", to: "/academie", perm: PERMS.ACADEMY_BROWSE },
  { icon: "assignment", title: "Mes inscriptions", text: "Sessions réservées et à payer.", to: "/app/academy/registrations", perm: PERMS.ACADEMY_BROWSE },
  { icon: "storefront", title: "Marketplace", text: "Matériel et demandes de devis.", to: "/marketplace/products", perm: PERMS.MARKETPLACE_BROWSE },
  { icon: "handyman", title: "Prestataires", text: "Services pour salles et studios.", to: "/services/providers", perm: PERMS.SERVICES_BROWSE },
  { icon: "event", title: "Events", text: "Compétitions, salons, networking.", to: "/app/events", perm: PERMS.EVENTS_BROWSE },
  { icon: "person", title: "Mon profil", text: "Photo, informations, préférences.", to: "/app/profile" },
  { icon: "credit_card", title: "Abonnement", text: "Offre, factures, moyen de paiement.", to: "/app/billing" },
];

function MemberDashboard() {
  const { user } = useAuth();
  const tiles = MEMBER_TILES.filter((tile) => !tile.perm || hasPermission(user, tile.perm));
  const verified = isVerified(user);
  return (
    <section className="vt-dash">
      <div className="vt-dash-hero">
        <div>
          <p className="vt-dash-kicker">Votre espace</p>
          <h1>
            Bonjour,
            <br />
            <span>{user?.firstName || user?.displayName || "champion"}.</span>
          </h1>
          <p className="vt-dash-lead">Tout le réseau Fitness Universe, à portée de main. Choisissez par où commencer.</p>
        </div>
        <div className="vt-dash-status">
          <Badge variant={verified ? "default" : "pending"}>{verificationLabel(user)}</Badge>
          <Link className="vt-dash-btn" to="/app/profile">
            {verified ? "Voir mon profil" : "Compléter mon profil"}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
          <Link className="vt-dash-link" to="/">
            Voir le site
          </Link>
        </div>
      </div>

      <div className="vt-dash-grid">
        {tiles.map((tile, index) => (
          <Link className="vt-dash-tile" to={tile.to} key={tile.to}>
            <span className="vt-dash-idx">{String(index + 1).padStart(2, "0")}</span>
            <span className="vt-dash-icon material-symbols-outlined" aria-hidden="true">
              {tile.icon}
            </span>
            <strong>{tile.title}</strong>
            <small>{tile.text}</small>
            <span className="vt-dash-go material-symbols-outlined" aria-hidden="true">
              north_east
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
