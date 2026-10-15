import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/AuthContext";
import { isVerified, verificationLabel } from "@/features/auth/types";
import { can, useBilling } from "@/features/billing/useBilling";
import { contractStatusLabel, fetchContracts, type Contract } from "@/features/contracts/api";
import { fetchJobOffers, type JobOffer } from "@/features/jobs/api";
import { notificationIcon, notificationTime, useNotifications } from "@/features/notifications/useNotifications";
import {
  fetchFavorites,
  fetchInboxCount,
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  statusLabel,
  type PipelineStatus,
  type Recruitment,
} from "@/features/recruitment/api";

const FUNNEL: { status: PipelineStatus; label: string }[] = [
  { status: "APPLIED", label: "Reçues" },
  { status: "NEW", label: "Nouveau" },
  { status: "CONTACTED", label: "Contacté" },
  { status: "INTERVIEW_SCHEDULED", label: "Entretien" },
  { status: "NEGOTIATION", label: "Négociation" },
  { status: "CONTRACT_SENT", label: "Contrat" },
  { status: "HIRED", label: "Recruté" },
];

type Task = { icon: string; text: string; to: string; urgent?: boolean };

export function EmployerDashboard() {
  const { user } = useAuth();
  const billing = useBilling();
  const notifications = useNotifications();
  const [pipeline, setPipeline] = useState<Recruitment[] | null>(null);
  const [offers, setOffers] = useState<JobOffer[] | null>(null);
  const [favorites, setFavorites] = useState<number | null>(null);
  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [inbox, setInbox] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruitments().then(setPipeline).catch(() => { setPipeline([]); setError("Certaines données n’ont pas pu être chargées."); });
    fetchJobOffers().then(setOffers).catch(() => setOffers([]));
    fetchFavorites().then((list) => setFavorites(list.length)).catch(() => setFavorites(0));
    fetchContracts().then(setContracts).catch(() => setContracts([]));
    fetchInboxCount().then((result) => setInbox(result.count)).catch(() => setInbox(0));
  }, []);

  const rows = pipeline ?? [];
  const open = rows.filter((row) => !["REJECTED", "ARCHIVED", "HIRED"].includes(row.status));
  const hired = rows.filter((row) => row.status === "HIRED").length;
  const published = (offers ?? []).filter((offer) => offer.status === "PUBLISHED");
  const drafts = (offers ?? []).filter((offer) => offer.status !== "PUBLISHED");
  const jobLimit = billing?.limits["hire.jobs"];
  const canJobs = can(billing, "hire.jobs");
  const interviews = rows
    .filter((row) => row.status === "INTERVIEW_SCHEDULED" && row.interviewAt && new Date(row.interviewAt).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => (a.interviewAt ?? "").localeCompare(b.interviewAt ?? ""));
  const toSign = (contracts ?? []).filter(
    (contract) =>
      (contract.status === "SENT" || contract.status === "CANDIDATE_SIGNED") &&
      Boolean(contract.candidateSignedAt) &&
      !contract.employerSignedAt,
  );
  const waitingCandidate = (contracts ?? []).filter(
    (contract) => (contract.status === "SENT" || contract.status === "EMPLOYER_SIGNED") && !contract.candidateSignedAt,
  );
  const unread = notifications.unreadCount;

  const counts = FUNNEL.map((stage) => ({
    ...stage,
    count: stage.status === "APPLIED" ? (inbox ?? 0) : rows.filter((row) => row.status === stage.status).length,
  }));
  const peak = Math.max(1, ...counts.map((stage) => stage.count));

  const tasks: Task[] = [];
  if (!isVerified(user)) {
    tasks.push({ icon: "verified_user", text: `Compte : ${verificationLabel(user).toLowerCase()}. La recherche de talents est réservée aux comptes vérifiés.`, to: "/app/profile", urgent: true });
  }
  if ((inbox ?? 0) > 0) {
    tasks.push({ icon: "inbox", text: `${inbox} candidature${(inbox ?? 0) > 1 ? "s" : ""} à examiner`, to: "/applications", urgent: true });
  }
  toSign.slice(0, 3).forEach((contract) =>
    tasks.push({ icon: "draw", text: `Contrat à signer : ${contract.candidateName} (${contract.jobOffer?.title || contract.terms?.position || "recrutement direct"})`, to: `/contracts/${contract.id}`, urgent: true }),
  );
  interviews.slice(0, 2).forEach((row) =>
    tasks.push({
      icon: "event",
      text: `Entretien avec ${row.candidate.displayName} le ${new Date(row.interviewAt as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
      to: "/applications",
    }),
  );
  if (drafts.length > 0) {
    tasks.push({ icon: "edit_note", text: `${drafts.length} offre${drafts.length > 1 ? "s" : ""} en brouillon à publier`, to: "/job-offers" });
  }
  if (offers && offers.length === 0 && canJobs) {
    tasks.push({ icon: "post_add", text: "Publiez votre première offre d’emploi", to: "/job-offers" });
  }

  return (
    <section className="pdx">
      <header className="pdx-hero">
        <div className="pdx-hero-copy">
          <p className="pdx-kicker">Espace employeur · salle · studio</p>
          <h1>
            Bonjour, <span>{user?.firstName || user?.displayName || "équipe"}.</span>
          </h1>
          <div className="pdx-badges">
            <Badge variant={isVerified(user) ? "default" : "pending"}>{verificationLabel(user)}</Badge>
            {user?.country ? <span className="pdx-chip">{user.country.flagEmoji} {user.country.name}</span> : null}
          </div>
        </div>
        <div className="pdx-hero-actions">
          {canJobs && (jobLimit == null || (offers?.length ?? 0) < jobLimit) ? (
            <Link className="pdx-cta" to="/job-offers">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              Nouvelle offre
            </Link>
          ) : null}
          <Link className="pdx-cta is-ghost" to="/candidates">
            <span className="material-symbols-outlined" aria-hidden="true">person_search</span>
            Rechercher des talents
          </Link>
        </div>
      </header>

      {error ? <p className="empty-hint">{error}</p> : null}

      <div className="pdx-kpis">
        <Link to="/applications" className={(inbox ?? 0) > 0 ? "pdx-kpi is-alert" : "pdx-kpi"} style={{ "--i": 0 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
          <b>{inbox ?? "—"}</b>
          <small>À examiner</small>
        </Link>
        <Link to="/applications" className="pdx-kpi" style={{ "--i": 1 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          <b>{pipeline ? open.length : "—"}</b>
          <small>Recrutements en cours</small>
        </Link>
        <Link to="/job-offers" className="pdx-kpi" style={{ "--i": 2 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
          <b>{offers ? `${published.length}${jobLimit != null ? `/${jobLimit}` : ""}` : "—"}</b>
          <small>Offres publiées</small>
        </Link>
        <Link to="/applications" className="pdx-kpi" style={{ "--i": 3 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">event</span>
          <b>{pipeline ? interviews.length : "—"}</b>
          <small>Entretien{interviews.length > 1 ? "s" : ""} à venir</small>
        </Link>
        <Link to="/contracts" className={toSign.length ? "pdx-kpi is-alert" : "pdx-kpi"} style={{ "--i": 4 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">draw</span>
          <b>{contracts ? toSign.length : "—"}</b>
          <small>Contrat{toSign.length > 1 ? "s" : ""} à signer</small>
        </Link>
        <Link to="/favorites" className="pdx-kpi" style={{ "--i": 5 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
          <b>{favorites ?? "—"}</b>
          <small>Favoris</small>
        </Link>
      </div>

      <div className="pdx-cols">
        <div className="pdx-main">
          <section className="pdx-card">
            <header>
              <h2>À faire</h2>
              <span>{tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""}` : "Tout est à jour"}</span>
            </header>
            {tasks.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span>Rien d’urgent pour le moment.</p>
            ) : (
              <ul className="pdx-tasks">
                {tasks.map((task) => (
                  <li key={`${task.icon}-${task.text}`} className={task.urgent ? "is-urgent" : ""}>
                    <Link to={task.to}>
                      <span className="material-symbols-outlined" aria-hidden="true">{task.icon}</span>
                      <span>{task.text}</span>
                      <span className="material-symbols-outlined pdx-go" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pdx-card">
            <header>
              <h2>Pipeline de recrutement</h2>
              <Link to="/applications">Ouvrir</Link>
            </header>
            {pipeline === null ? (
              <div className="pdx-skeleton" />
            ) : (
              <ol className="pdx-funnel">
                {counts.map((stage, index) => (
                  <li key={stage.status} style={{ "--i": index } as CSSProperties}>
                    <span className="pdx-funnel-label">{stage.label}</span>
                    <span className="pdx-funnel-bar">
                      <span style={{ width: `${(stage.count / peak) * 100}%` }} />
                    </span>
                    <b>{stage.count}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="pdx-foot">{hired} recrutement{hired > 1 ? "s" : ""} finalisé{hired > 1 ? "s" : ""} au total.</p>
          </section>

          <section className="pdx-card">
            <header>
              <h2>Dossiers récents</h2>
              <Link to="/applications">Voir tout</Link>
            </header>
            {pipeline === null ? (
              <div className="pdx-skeleton" />
            ) : rows.length === 0 ? (
              <p className="pdx-empty">
                <span className="material-symbols-outlined" aria-hidden="true">group_off</span>
                Aucun recrutement en cours. <Link to="/candidates">Rechercher un talent</Link>
              </p>
            ) : (
              <ul className="pdx-apps">
                {rows.slice(0, 5).map((row) => (
                  <li key={row.id}>
                    <Link to="/applications">
                      <div className="pdx-app-top">
                        <strong>{row.candidate.displayName}</strong>
                        <span className="pdx-pill">{statusLabel(row.status)}</span>
                      </div>
                      <small>
                        {opportunityLabel(row)} · {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="pdx-side">
          <section className="pdx-card">
            <header>
              <h2>Mes offres</h2>
              <Link to="/job-offers">Gérer</Link>
            </header>
            {offers === null ? (
              <div className="pdx-skeleton" />
            ) : offers.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">post_add</span>Aucune offre. <Link to="/job-offers">En créer une</Link></p>
            ) : (
              <ul className="pdx-opps">
                {offers.slice(0, 4).map((offer) => (
                  <li key={offer.id}>
                    <Link to="/job-offers">
                      <strong>{offer.title}</strong>
                      <small>
                        {[offer.position, offer.location].filter(Boolean).join(" · ") || "Détails non renseignés"}
                      </small>
                      <span className={offer.status === "PUBLISHED" ? "pdx-pill" : "pdx-pill is-muted"}>
                        {offer.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pdx-card">
            <header>
              <h2>Contrats</h2>
              <Link to="/contracts">Voir tout</Link>
            </header>
            {contracts === null ? (
              <div className="pdx-skeleton" />
            ) : contracts.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">description</span>Aucun contrat pour le moment.</p>
            ) : (
              <ul className="pdx-opps">
                {contracts.slice(0, 3).map((contract) => (
                  <li key={contract.id}>
                    <Link to={`/contracts/${contract.id}`}>
                      <strong>{contract.candidateName}</strong>
                      <small>{contract.jobOffer?.title || contract.terms?.position || "Recrutement direct"}</small>
                      <span className="pdx-pill is-muted">{contractStatusLabel(contract.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {waitingCandidate.length > 0 ? (
              <p className="pdx-foot">{waitingCandidate.length} contrat{waitingCandidate.length > 1 ? "s" : ""} en attente de la signature du candidat.</p>
            ) : null}
          </section>

          <section className="pdx-card">
            <header>
              <h2>Notifications</h2>
              {unread > 0 ? <button type="button" onClick={() => void notifications.markAllRead()}>Tout lire</button> : null}
            </header>
            {notifications.items.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">notifications_off</span>Aucune notification.</p>
            ) : (
              <ul className="pdx-notifs">
                {notifications.items.slice(0, 4).map((item) => (
                  <li key={item.id} className={item.readAt ? "" : "is-unread"}>
                    <Link to={item.actionPath ?? "/app/dashboard"} onClick={() => !item.readAt && void notifications.markRead(item.id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">{notificationIcon(item)}</span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{notificationTime(item.createdAt)}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
