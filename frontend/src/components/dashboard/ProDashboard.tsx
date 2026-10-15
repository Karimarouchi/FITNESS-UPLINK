import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isVerified, verificationLabel } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchContracts, type Contract } from "@/features/contracts/api";
import {
  fetchAgendaSummary,
  fetchCoachBookings,
  type Booking,
  type CoachAgendaSummary,
} from "@/features/coaching/api";
import { fetchOpportunities, type Opportunity } from "@/features/jobs/api";
import { useOwnProfile } from "@/features/me/ownProfile";
import { notificationIcon, notificationTime, useNotifications } from "@/features/notifications/useNotifications";
import {
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  type PipelineStatus,
  type Recruitment,
} from "@/features/recruitment/api";

const PROGRESS_STEPS = ["Envoyée", "En étude", "Entretien", "Contrat", "Recruté"];

function progressOf(status: PipelineStatus): number | null {
  switch (status) {
    case "APPLIED":
      return 0;
    case "NEW":
    case "CONTACTED":
      return 1;
    case "INTERVIEW_SCHEDULED":
    case "NEGOTIATION":
      return 2;
    case "CONTRACT_SENT":
      return 3;
    case "HIRED":
      return 4;
    default:
      return null;
  }
}

function stepLabel(status: PipelineStatus) {
  const index = progressOf(status);
  return index === null ? "Clôturée" : PROGRESS_STEPS[index];
}

type Task = { icon: string; text: string; to: string; urgent?: boolean };

export function ProDashboard() {
  const { user } = useAuth();
  const { profile } = useOwnProfile();
  const notifications = useNotifications();
  const isCoach = hasPermission(user, PERMS.COACHING_MANAGE);
  const canHire = hasPermission(user, PERMS.HIRE_APPLY);
  const canContracts = hasPermission(user, PERMS.HIRE_CONTRACTS_CANDIDATE);
  const [rows, setRows] = useState<Recruitment[] | null>(canHire ? null : []);
  const [contracts, setContracts] = useState<Contract[] | null>(canContracts ? null : []);
  const [opportunities, setOpportunities] = useState<Opportunity[] | null>(canHire ? null : []);
  const [summary, setSummary] = useState<CoachAgendaSummary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canHire) {
      fetchRecruitments().then(setRows).catch(() => { setRows([]); setError("Certaines données n’ont pas pu être chargées."); });
      fetchOpportunities().then(setOpportunities).catch(() => setOpportunities([]));
    }
    if (canContracts) {
      fetchContracts().then(setContracts).catch(() => setContracts([]));
    }
    if (isCoach) {
      fetchAgendaSummary().then(setSummary).catch(() => setSummary(null));
      fetchCoachBookings().then(setBookings).catch(() => setBookings([]));
    }
  }, [isCoach, canHire, canContracts]);

  const active = (rows ?? []).filter((row) => !["REJECTED", "ARCHIVED", "HIRED"].includes(row.status));
  const interviews = (rows ?? [])
    .filter((row) => row.status === "INTERVIEW_SCHEDULED" && row.interviewAt && new Date(row.interviewAt).getTime() > Date.now() - 3_600_000)
    .sort((a, b) => (a.interviewAt ?? "").localeCompare(b.interviewAt ?? ""));
  const toSign = (contracts ?? []).filter(
    (contract) => (contract.status === "SENT" || contract.status === "EMPLOYER_SIGNED") && !contract.candidateSignedAt,
  );

  // Profile completeness: each item is a real, checkable part of a fitness professional's file.
  const checklist = useMemo(
    () => [
      { label: "Titre et ville", done: Boolean(profile?.title && profile?.city), to: "/app/profile/edit" },
      { label: "Présentation", done: Boolean(profile?.biography), to: "/app/profile/edit" },
      { label: "Spécialités", done: (profile?.specialties.length ?? 0) > 0, to: "/app/profile/edit" },
      { label: "Expérience", done: (profile?.experiences.length ?? 0) > 0, to: "/app/profile/edit" },
      { label: "CV", done: Boolean(profile?.cv), to: "/app/cv" },
      {
        label: "Diplôme ou certification",
        done: (profile?.diplomas.length ?? 0) + (profile?.certifications.length ?? 0) > 0,
        to: "/app/certifications",
      },
      { label: "Disponibilité", done: Boolean(profile?.availability), to: "/app/availability" },
    ],
    [profile],
  );
  const doneCount = checklist.filter((item) => item.done).length;
  const completion = Math.round((doneCount / checklist.length) * 100);
  const missing = checklist.filter((item) => !item.done);

  const now = Date.now();
  const upcomingSessions = bookings
    .filter((b) => b.status === "CONFIRMED" && new Date(b.scheduledAt).getTime() >= now - 3_600_000)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 4);

  const tasks: Task[] = [];
  if (!isVerified(user)) {
    tasks.push({ icon: "verified_user", text: `Compte : ${verificationLabel(user).toLowerCase()}. Complétez votre dossier pour être vérifié.`, to: "/app/profile", urgent: true });
  }
  toSign.forEach((contract) => tasks.push({ icon: "draw", text: `Contrat à signer : ${contract.title}`, to: `/contracts/${contract.id}`, urgent: true }));
  if (summary && summary.pendingRequests > 0) {
    tasks.push({ icon: "pending_actions", text: `${summary.pendingRequests} demande${summary.pendingRequests > 1 ? "s" : ""} de séance à traiter`, to: "/app/coaching/agenda", urgent: true });
  }
  interviews.slice(0, 2).forEach((row) =>
    tasks.push({
      icon: "event",
      text: `Entretien ${row.employer?.displayName ? `avec ${row.employer.displayName}` : ""} le ${new Date(row.interviewAt as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
      to: "/app/applications",
    }),
  );
  missing.slice(0, 3).forEach((item) => tasks.push({ icon: "edit_note", text: `Profil : ajouter ${item.label.toLowerCase()}`, to: item.to }));

  const unread = notifications.unreadCount;
  const recommended = (opportunities ?? []).filter((item) => !item.applied).slice(0, 3);
  const firstName = user?.firstName || user?.displayName || "champion";

  return (
    <section className="pdx">
      <header className="pdx-hero">
        <div className="pdx-hero-copy">
          <p className="pdx-kicker">Votre espace professionnel</p>
          <h1>
            Bonjour, <span>{firstName}.</span>
          </h1>
          <div className="pdx-badges">
            <Badge variant={isVerified(user) ? "default" : user?.verificationStatus === "rejected" ? "warn" : "pending"}>
              {verificationLabel(user)}
            </Badge>
            {profile?.availabilityLabel ? <span className="pdx-chip">Disponibilité : {profile.availabilityLabel}</span> : null}
            {profile?.city ? <span className="pdx-chip">{profile.city}</span> : null}
          </div>
        </div>
        <div className="pdx-ring" style={{ "--p": completion } as CSSProperties} role="img" aria-label={`Profil complété à ${completion} %`}>
          <div>
            <b>{completion}%</b>
            <small>Profil complété</small>
          </div>
        </div>
      </header>

      {error ? <p className="empty-hint">{error}</p> : null}

      <div className="pdx-kpis">
        {canHire ? (
          <>
        <Link to="/app/applications" className="pdx-kpi" style={{ "--i": 0 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">work</span>
          <b>{rows ? active.length : "—"}</b>
          <small>Candidatures actives</small>
        </Link>
        <Link to="/app/applications" className="pdx-kpi" style={{ "--i": 1 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">event</span>
          <b>{rows ? interviews.length : "—"}</b>
          <small>Entretien{interviews.length > 1 ? "s" : ""} à venir</small>
        </Link>
          </>
        ) : null}
        {canContracts ? (
          <Link to="/contracts" className={toSign.length ? "pdx-kpi is-alert" : "pdx-kpi"} style={{ "--i": 2 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">draw</span>
            <b>{contracts ? toSign.length : "—"}</b>
            <small>Contrat{toSign.length > 1 ? "s" : ""} à signer</small>
          </Link>
        ) : null}
        <Link to="/app/profile" className="pdx-kpi" style={{ "--i": 3 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          <b>{unread}</b>
          <small>Notification{unread > 1 ? "s" : ""} non lue{unread > 1 ? "s" : ""}</small>
        </Link>
        {isCoach ? (
          <>
            <Link to="/app/coaching/agenda" className="pdx-kpi" style={{ "--i": 4 } as CSSProperties}>
              <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
              <b>{summary?.sessionsThisWeek ?? "—"}</b>
              <small>Séances cette semaine</small>
            </Link>
            <Link to="/app/coaching/agenda" className={summary && summary.pendingRequests > 0 ? "pdx-kpi is-alert" : "pdx-kpi"} style={{ "--i": 5 } as CSSProperties}>
              <span className="material-symbols-outlined" aria-hidden="true">pending_actions</span>
              <b>{summary?.pendingRequests ?? "—"}</b>
              <small>Demandes en attente</small>
            </Link>
            <Link to="/app/coaching/packs" className="pdx-kpi" style={{ "--i": 6 } as CSSProperties}>
              <span className="material-symbols-outlined" aria-hidden="true">groups</span>
              <b>{summary?.activeClients ?? "—"}</b>
              <small>Clients actifs</small>
            </Link>
            <Link to="/app/coaching/agenda" className="pdx-kpi" style={{ "--i": 7 } as CSSProperties}>
              <span className="material-symbols-outlined" aria-hidden="true">star</span>
              <b>{summary && summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "—"}</b>
              <small>Note moyenne</small>
            </Link>
          </>
        ) : null}
      </div>

      {isCoach ? (
        <nav className="pdx-links" aria-label="Raccourcis coaching">
          <Link to="/app/coaching/agenda"><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>Agenda</Link>
          <Link to="/app/coaching/services"><span className="material-symbols-outlined" aria-hidden="true">fitness_center</span>Mes services</Link>
          <Link to="/app/coaching/packs"><span className="material-symbols-outlined" aria-hidden="true">sell</span>Packs</Link>
          <Link to={`/coaches/${user?.id ?? ""}`}><span className="material-symbols-outlined" aria-hidden="true">badge</span>Profil public</Link>
          <Link to="/app/profile/edit"><span className="material-symbols-outlined" aria-hidden="true">edit</span>Mon profil</Link>
        </nav>
      ) : null}

      <div className="pdx-cols">
        <div className="pdx-main">
          <section className="pdx-card">
            <header>
              <h2>À faire</h2>
              <span>{tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""}` : "Tout est à jour"}</span>
            </header>
            {tasks.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">task_alt</span>Rien à faire pour le moment. Bravo !</p>
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

          {canHire ? (
          <section className="pdx-card">
            <header>
              <h2>Mes candidatures</h2>
              <Link to="/app/applications">Voir tout</Link>
            </header>
            {rows === null ? (
              <div className="pdx-skeleton" />
            ) : active.length === 0 ? (
              <p className="pdx-empty">
                <span className="material-symbols-outlined" aria-hidden="true">work_history</span>
                Aucune candidature en cours. <Link to="/app/opportunities">Parcourir les opportunités</Link>
              </p>
            ) : (
              <ul className="pdx-apps">
                {active.slice(0, 4).map((row) => {
                  const reached = progressOf(row.status) ?? 0;
                  return (
                    <li key={row.id}>
                      <Link to="/app/applications">
                        <div className="pdx-app-top">
                          <strong>{opportunityLabel(row)}</strong>
                          <span className="pdx-pill">{stepLabel(row.status)}</span>
                        </div>
                        <small>{row.employer?.displayName ?? "Employeur"} · mis à jour le {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</small>
                        <div className="pdx-track" aria-hidden="true">
                          {PROGRESS_STEPS.map((step, index) => (
                            <span key={step} className={index < reached ? "is-done" : index === reached ? "is-current" : ""} />
                          ))}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          ) : null}

          {isCoach ? (
            <section className="pdx-card">
              <header>
                <h2>Prochaines séances</h2>
                <Link to="/app/coaching/agenda">Agenda</Link>
              </header>
              {upcomingSessions.length === 0 ? (
                <p className="pdx-empty">
                  <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                  Aucune séance confirmée à venir.
                </p>
              ) : (
                <ul className="pdx-sessions">
                  {upcomingSessions.map((session) => (
                    <li key={session.id}>
                      <time>
                        <b>{new Date(session.scheduledAt).toLocaleDateString("fr-FR", { day: "2-digit" })}</b>
                        <small>{new Date(session.scheduledAt).toLocaleDateString("fr-FR", { month: "short" })}</small>
                      </time>
                      <div>
                        <strong>{session.clientDisplayName ?? "Client"}</strong>
                        <small>
                          {new Date(session.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {session.serviceName} · {session.durationMinutes} min
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="pdx-side">
          <section className="pdx-card">
            <header>
              <h2>Mon profil</h2>
              <Link to="/app/profile/edit">Modifier</Link>
            </header>
            <ul className="pdx-check">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? "is-done" : ""}>
                  <Link to={item.to}>
                    <span className="material-symbols-outlined" aria-hidden="true">{item.done ? "check_circle" : "radio_button_unchecked"}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {canHire ? (
          <section className="pdx-card">
            <header>
              <h2>Opportunités pour vous</h2>
              <Link to="/app/opportunities">Tout voir</Link>
            </header>
            {opportunities === null ? (
              <div className="pdx-skeleton" />
            ) : recommended.length === 0 ? (
              <p className="pdx-empty"><span className="material-symbols-outlined" aria-hidden="true">search_off</span>Aucune nouvelle offre.</p>
            ) : (
              <ul className="pdx-opps">
                {recommended.map((offer) => (
                  <li key={offer.id}>
                    <Link to={`/app/opportunities/${offer.id}`}>
                      <strong>{offer.title}</strong>
                      <small>
                        {offer.employerName}
                        {offer.location ? ` · ${offer.location}` : ""}
                      </small>
                      {offer.salaryAmount ? <b>{offer.salaryAmount} {offer.salaryCurrency}</b> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          ) : null}

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
