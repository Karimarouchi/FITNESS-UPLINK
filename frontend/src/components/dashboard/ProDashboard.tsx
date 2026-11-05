import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellOff,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  Circle,
  FilePenLine,
  FileSignature,
  GraduationCap,
  History,
  IdCard,
  MessageSquare,
  Pencil,
  SearchX,
  ShieldCheck,
  Star,
  Tag,
  Ticket,
  Users,
  Dumbbell,
  Wallet,
} from "lucide-react";
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
import "@/shared/styles/backoffice-pro.css";

type IconType = ComponentType<{ size?: number }>;

const PROGRESS_STEPS = ["Envoyée", "En étude", "Entretien", "Contrat", "Recruté"];

// the notification helper names a Material Symbol; this dashboard shows the matching Lucide icon
const NOTIFICATION_ICONS: Record<string, IconType> = {
  payments: Wallet,
  chat: MessageSquare,
  event_busy: CalendarX,
  event_seat: Ticket,
  school: GraduationCap,
  event_available: CalendarCheck,
  contract: FileSignature,
  work: BriefcaseBusiness,
  verified_user: ShieldCheck,
  notifications: Bell,
};

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

type Task = { icon: IconType; text: string; to: string; urgent?: boolean };

function Ring({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="pp-ring" role="img" aria-label={`Profil complété à ${value} %`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="pp-ring-bg" cx="50" cy="50" r={radius} />
        <circle
          className="pp-ring-fg"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div>
        <b>{value}%</b>
        <small>Profil complété</small>
      </div>
    </div>
  );
}

function Kpi({
  to,
  icon: Icon,
  tone = "",
  value,
  label,
  alert,
}: {
  to: string;
  icon: IconType;
  tone?: string;
  value: ReactNode;
  label: string;
  alert?: boolean;
}) {
  return (
    <Link to={to} className={alert ? "pp-kpi is-alert" : "pp-kpi"}>
      <span className={`pp-icon ${alert ? "is-rose" : tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="pp-kpi-label">{label}</span>
      <span className="pp-kpi-value">{value}</span>
    </Link>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pp-card">
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Empty({ icon: Icon, children }: { icon: IconType; children: ReactNode }) {
  return (
    <p className="pp-empty">
      <span aria-hidden="true">
        <Icon size={20} />
      </span>
      <span>{children}</span>
    </p>
  );
}

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
    tasks.push({ icon: ShieldCheck, text: `Compte : ${verificationLabel(user).toLowerCase()}. Complétez votre dossier pour être vérifié.`, to: "/app/profile", urgent: true });
  }
  toSign.forEach((contract) => tasks.push({ icon: FileSignature, text: `Contrat à signer : ${contract.title}`, to: `/contracts/${contract.id}`, urgent: true }));
  if (summary && summary.pendingRequests > 0) {
    tasks.push({ icon: ClipboardList, text: `${summary.pendingRequests} demande${summary.pendingRequests > 1 ? "s" : ""} de séance à traiter`, to: "/app/coaching/agenda", urgent: true });
  }
  interviews.slice(0, 2).forEach((row) =>
    tasks.push({
      icon: CalendarDays,
      text: `Entretien ${row.employer?.displayName ? `avec ${row.employer.displayName}` : ""} le ${new Date(row.interviewAt as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}`,
      to: "/app/applications",
    }),
  );
  missing.slice(0, 3).forEach((item) => tasks.push({ icon: FilePenLine, text: `Profil : ajouter ${item.label.toLowerCase()}`, to: item.to }));

  const unread = notifications.unreadCount;
  const recommended = (opportunities ?? []).filter((item) => !item.applied).slice(0, 3);
  const firstName = user?.firstName || user?.displayName || "champion";
  const verified = isVerified(user);
  const statusTone = verified ? "is-success" : user?.verificationStatus === "rejected" ? "is-danger" : "is-warn";

  return (
    <section className="pp">
      <header className="pp-head">
        <div className="pp-head-copy">
          <p className="pp-kicker">Votre espace professionnel</p>
          <h1>
            Bonjour, <span>{firstName}.</span>
          </h1>
          <div className="pp-badges">
            <span className={`pp-status ${statusTone}`}>{verificationLabel(user)}</span>
            {profile?.availabilityLabel ? <span className="pp-chip">Disponibilité : {profile.availabilityLabel}</span> : null}
            {profile?.city ? <span className="pp-chip">{profile.city}</span> : null}
          </div>
        </div>
        <Ring value={completion} />
      </header>

      {error ? (
        <p className="pp-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="pp-kpis">
        {canHire ? (
          <>
            <Kpi to="/app/applications" icon={BriefcaseBusiness} value={rows ? active.length : "—"} label="Candidatures actives" />
            <Kpi to="/app/applications" icon={CalendarClock} tone="is-blue" value={rows ? interviews.length : "—"} label={`Entretien${interviews.length > 1 ? "s" : ""} à venir`} />
          </>
        ) : null}
        {canContracts ? (
          <Kpi
            to="/contracts"
            icon={FileSignature}
            tone="is-violet"
            alert={toSign.length > 0}
            value={contracts ? toSign.length : "—"}
            label={`Contrat${toSign.length > 1 ? "s" : ""} à signer`}
          />
        ) : null}
        <Kpi to="/notifications" icon={Bell} tone="is-neutral" value={unread} label={`Notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}`} />
        {isCoach ? (
          <>
            <Kpi to="/app/coaching/agenda" icon={CalendarCheck} tone="is-blue" value={summary?.sessionsThisWeek ?? "—"} label="Séances cette semaine" />
            <Kpi
              to="/app/coaching/agenda"
              icon={ClipboardList}
              alert={Boolean(summary && summary.pendingRequests > 0)}
              value={summary?.pendingRequests ?? "—"}
              label="Demandes en attente"
            />
            <Kpi to="/app/coaching/packs" icon={Users} tone="is-neutral" value={summary?.activeClients ?? "—"} label="Clients actifs" />
            <Kpi to="/app/coaching/agenda" icon={Star} value={summary && summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "—"} label="Note moyenne" />
          </>
        ) : null}
      </div>

      {isCoach ? (
        <nav className="pp-links" aria-label="Raccourcis coaching">
          <Link to="/app/coaching/agenda"><CalendarDays size={16} aria-hidden="true" />Agenda</Link>
          <Link to="/app/coaching/services"><Dumbbell size={16} aria-hidden="true" />Mes services</Link>
          <Link to="/app/coaching/packs"><Tag size={16} aria-hidden="true" />Packs</Link>
          <Link to={`/coaches/${user?.id ?? ""}`}><IdCard size={16} aria-hidden="true" />Profil public</Link>
          <Link to="/app/profile/edit"><Pencil size={16} aria-hidden="true" />Mon profil</Link>
        </nav>
      ) : null}

      <div className="pp-cols">
        <div className="pp-main">
          <Card title="À faire" action={<span className="pp-meta">{tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""}` : "Tout est à jour"}</span>}>
            {tasks.length === 0 ? (
              <Empty icon={CheckCircle2}>Rien à faire pour le moment. Bravo !</Empty>
            ) : (
              <ul className="pp-tasks">
                {tasks.map((task) => {
                  const Icon = task.icon;
                  return (
                    <li key={`${task.text}`}>
                      <Link to={task.to} className={task.urgent ? "is-urgent" : ""}>
                        <span className="pp-task-icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        <span className="pp-task-text">{task.text}</span>
                        <ArrowRight size={16} className="pp-go" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {canHire ? (
            <Card title="Mes candidatures" action={<Link className="pp-link" to="/app/applications">Voir tout</Link>}>
              {rows === null ? (
                <div className="pp-skel" />
              ) : active.length === 0 ? (
                <Empty icon={History}>
                  Aucune candidature en cours. <Link to="/app/opportunities">Parcourir les opportunités</Link>
                </Empty>
              ) : (
                <ul className="pp-apps">
                  {active.slice(0, 4).map((row) => {
                    const reached = progressOf(row.status) ?? 0;
                    return (
                      <li key={row.id}>
                        <Link to="/app/applications">
                          <span className="pp-app-top">
                            <strong>{opportunityLabel(row)}</strong>
                            <span className="pp-status is-info">{stepLabel(row.status)}</span>
                          </span>
                          <small>{row.employer?.displayName ?? "Employeur"} · mis à jour le {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</small>
                          <span className="pp-track" aria-hidden="true">
                            {PROGRESS_STEPS.map((step, index) => (
                              <i key={step} className={index < reached ? "is-done" : index === reached ? "is-current" : ""} />
                            ))}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ) : null}

          {isCoach ? (
            <Card title="Prochaines séances" action={<Link className="pp-link" to="/app/coaching/agenda">Agenda</Link>}>
              {upcomingSessions.length === 0 ? (
                <Empty icon={CalendarX}>Aucune séance confirmée à venir.</Empty>
              ) : (
                <ul className="pp-sessions">
                  {upcomingSessions.map((session) => (
                    <li key={session.id}>
                      <time dateTime={session.scheduledAt}>
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
            </Card>
          ) : null}
        </div>

        <aside className="pp-side">
          <Card title="Mon profil" action={<Link className="pp-link" to="/app/profile/edit">Modifier</Link>}>
            <ul className="pp-check">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? "is-done" : ""}>
                  <Link to={item.to}>
                    {item.done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {canHire ? (
            <Card title="Opportunités pour vous" action={<Link className="pp-link" to="/app/opportunities">Tout voir</Link>}>
              {opportunities === null ? (
                <div className="pp-skel" />
              ) : recommended.length === 0 ? (
                <Empty icon={SearchX}>Aucune nouvelle offre.</Empty>
              ) : (
                <ul className="pp-opps">
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
            </Card>
          ) : null}

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
