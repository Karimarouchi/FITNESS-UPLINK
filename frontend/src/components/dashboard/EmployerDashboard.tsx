import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellOff,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FilePenLine,
  FilePlus2,
  FileSignature,
  FileText,
  Heart,
  Inbox,
  Megaphone,
  Plus,
  ShieldCheck,
  UserSearch,
  Users,
  UsersRound,
} from "lucide-react";
import { Card, Empty, Kpi, NOTIFICATION_ICONS, type IconType } from "./ppParts";
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

type Task = { icon: IconType; text: string; to: string; urgent?: boolean };

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
    tasks.push({ icon: ShieldCheck, text: `Compte : ${verificationLabel(user).toLowerCase()}. La recherche de talents est réservée aux comptes vérifiés.`, to: "/app/profile", urgent: true });
  }
  if ((inbox ?? 0) > 0) {
    tasks.push({ icon: Inbox, text: `${inbox} candidature${(inbox ?? 0) > 1 ? "s" : ""} à examiner`, to: "/applications", urgent: true });
  }
  toSign.slice(0, 3).forEach((contract) =>
    tasks.push({ icon: FileSignature, text: `Contrat à signer : ${contract.candidateName} (${contract.jobOffer?.title || contract.terms?.position || "recrutement direct"})`, to: `/contracts/${contract.id}`, urgent: true }),
  );
  interviews.slice(0, 2).forEach((row) =>
    tasks.push({
      icon: CalendarDays,
      text: `Entretien avec ${row.candidate.displayName} le ${new Date(row.interviewAt as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
      to: "/applications",
    }),
  );
  if (drafts.length > 0) {
    tasks.push({ icon: FilePenLine, text: `${drafts.length} offre${drafts.length > 1 ? "s" : ""} en brouillon à publier`, to: "/job-offers" });
  }
  if (offers && offers.length === 0 && canJobs) {
    tasks.push({ icon: FilePlus2, text: "Publiez votre première offre d’emploi", to: "/job-offers" });
  }

  const verified = isVerified(user);
  const firstName = user?.firstName || user?.displayName || "équipe";
  const canCreate = canJobs && (jobLimit == null || (offers?.length ?? 0) < jobLimit);

  return (
    <section className="pp">
      <header className="pp-head">
        <div className="pp-head-copy">
          <p className="pp-kicker">Espace employeur · salle · studio</p>
          <h1>
            Bonjour, <span>{firstName}.</span>
          </h1>
          <div className="pp-badges">
            <span className={`pp-status ${verified ? "is-success" : "is-warn"}`}>{verificationLabel(user)}</span>
            {user?.country ? (
              <span className="pp-chip">
                {user.country.flagEmoji} {user.country.name}
              </span>
            ) : null}
          </div>
        </div>
        <div className="pp-head-actions">
          {canCreate ? (
            <Link className="pp-cta" to="/job-offers">
              <Plus size={16} aria-hidden="true" />
              Nouvelle offre
            </Link>
          ) : null}
          <Link className="pp-cta is-outline" to="/candidates">
            <UserSearch size={16} aria-hidden="true" />
            Rechercher des talents
          </Link>
        </div>
      </header>

      {error ? (
        <p className="pp-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pp-kpis pp-kpis--6">
        <Kpi to="/applications" icon={Inbox} alert={(inbox ?? 0) > 0} value={inbox ?? "—"} label="À examiner" />
        <Kpi to="/applications" icon={UsersRound} tone="is-blue" value={pipeline ? open.length : "—"} label="Recrutements en cours" />
        <Kpi
          to="/job-offers"
          icon={Megaphone}
          tone="is-violet"
          value={offers ? `${published.length}${jobLimit != null ? `/${jobLimit}` : ""}` : "—"}
          label="Offres publiées"
        />
        <Kpi to="/applications" icon={CalendarClock} tone="is-blue" value={pipeline ? interviews.length : "—"} label={`Entretien${interviews.length > 1 ? "s" : ""} à venir`} />
        <Kpi to="/contracts" icon={FileSignature} tone="is-violet" alert={toSign.length > 0} value={contracts ? toSign.length : "—"} label={`Contrat${toSign.length > 1 ? "s" : ""} à signer`} />
        <Kpi to="/favorites" icon={Heart} tone="is-neutral" value={favorites ?? "—"} label="Favoris" />
      </div>

      <div className="pp-cols">
        <div className="pp-main">
          <Card title="À faire" action={<span className="pp-meta">{tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""}` : "Tout est à jour"}</span>}>
            {tasks.length === 0 ? (
              <Empty icon={CheckCircle2}>Rien d’urgent pour le moment.</Empty>
            ) : (
              <ul className="pp-tasks">
                {tasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <li key={task.text}>
                      <Link to={task.to} className={task.urgent ? "is-urgent" : ""}>
                        <span className="pp-task-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span className="pp-task-text">{task.text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Pipeline de recrutement" action={<Link className="pp-link" to="/applications">Ouvrir</Link>}>
            {pipeline === null ? (
              <div className="pp-skel" />
            ) : (
              <ol className="pp-funnel">
                {counts.map((stage) => (
                  <li key={stage.status}>
                    <span className="pp-funnel-label">{stage.label}</span>
                    <span className="pp-funnel-bar" aria-hidden="true">
                      <i style={{ width: `${(stage.count / peak) * 100}%` }} />
                    </span>
                    <b>{stage.count}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="pp-foot">
              {hired} recrutement{hired > 1 ? "s" : ""} finalisé{hired > 1 ? "s" : ""} au total.
            </p>
          </Card>

          <Card title="Dossiers récents" action={<Link className="pp-link" to="/applications">Voir tout</Link>}>
            {pipeline === null ? (
              <div className="pp-skel" />
            ) : rows.length === 0 ? (
              <Empty icon={Users}>
                Aucun recrutement en cours. <Link to="/candidates">Rechercher un talent</Link>
              </Empty>
            ) : (
              <ul className="pp-apps">
                {rows.slice(0, 5).map((row) => (
                  <li key={row.id}>
                    <Link to="/applications">
                      <span className="pp-app-top">
                        <strong>{row.candidate.displayName}</strong>
                        <span className="pp-status is-info">{statusLabel(row.status)}</span>
                      </span>
                      <small>
                        {opportunityLabel(row)} · {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="pp-side">
          <Card title="Mes offres" action={<Link className="pp-link" to="/job-offers">Gérer</Link>}>
            {offers === null ? (
              <div className="pp-skel" />
            ) : offers.length === 0 ? (
              <Empty icon={FilePlus2}>
                Aucune offre. <Link to="/job-offers">En créer une</Link>
              </Empty>
            ) : (
              <ul className="pp-opps">
                {offers.slice(0, 4).map((offer) => (
                  <li key={offer.id}>
                    <Link to="/job-offers">
                      <strong>{offer.title}</strong>
                      <small>{[offer.position, offer.location].filter(Boolean).join(" · ") || "Détails non renseignés"}</small>
                      <span className={`pp-status ${offer.status === "PUBLISHED" ? "is-success" : "is-warn"}`}>
                        {offer.status === "PUBLISHED" ? "Publiée" : "Brouillon"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Contrats" action={<Link className="pp-link" to="/contracts">Voir tout</Link>}>
            {contracts === null ? (
              <div className="pp-skel" />
            ) : contracts.length === 0 ? (
              <Empty icon={FileText}>Aucun contrat pour le moment.</Empty>
            ) : (
              <ul className="pp-opps">
                {contracts.slice(0, 3).map((contract) => (
                  <li key={contract.id}>
                    <Link to={`/contracts/${contract.id}`}>
                      <strong>{contract.candidateName}</strong>
                      <small>{contract.jobOffer?.title || contract.terms?.position || "Recrutement direct"}</small>
                      <span className="pp-status is-neutral">{contractStatusLabel(contract.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {waitingCandidate.length > 0 ? (
              <p className="pp-foot">
                {waitingCandidate.length} contrat{waitingCandidate.length > 1 ? "s" : ""} en attente de la signature du candidat.
              </p>
            ) : null}
          </Card>

          <Card
            title="Notifications"
            action={unread > 0 ? <button type="button" className="pp-link" onClick={() => void notifications.markAllRead()}>Tout lire</button> : undefined}
          >
            {notifications.items.length === 0 ? (
              <Empty icon={BellOff}>Aucune notification.</Empty>
            ) : (
              <ul className="pp-notifs">
                {notifications.items.slice(0, 4).map((item) => {
                  const Icon = NOTIFICATION_ICONS[notificationIcon(item)] ?? Bell;
                  return (
                    <li key={item.id} className={item.readAt ? "" : "is-unread"}>
                      <Link to={item.actionPath ?? "/app/dashboard"} onClick={() => !item.readAt && void notifications.markRead(item.id)}>
                        <span className="pp-task-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>{notificationTime(item.createdAt)}</small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </section>
  );
}
