import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  FilePlus2,
  FileSignature,
  Inbox,
  MessagesSquare,
  PackageOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isVerified, verificationLabel, type AuthUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchMyFormations, fetchMyRegistrations, fetchMySessions, type Registration } from "@/features/academy/api";
import { can, useBilling } from "@/features/billing/useBilling";
import { fetchCoachBookings, fetchMyBookings, type Booking } from "@/features/coaching/api";
import { fetchContracts, type Contract } from "@/features/contracts/api";
import { fetchJobOffers, type JobOffer } from "@/features/jobs/api";
import { fetchConversations, fetchSupplierStats, type Conversation } from "@/features/marketplace/api";
import { useOwnProfile } from "@/features/me/ownProfile";
import { notificationTime, useNotifications } from "@/features/notifications/useNotifications";
import { fetchInboxCount, fetchRecruitments, opportunityLabel, type PipelineStatus, type Recruitment } from "@/features/recruitment/api";
import { fetchReceivedQuoteRequests, type QuoteRequest } from "@/features/services/api";
import { WORKSPACES } from "@/features/workspace/ModuleWorkspacePage";

type Shortcut = { to: string; image: string; label: string; external?: boolean };

/** One line of the list. With `at` it shows that date; without, it shows `icon` (a task has no date). */
type HomeItem = { id: string; title: string; detail?: string; note?: string; to: string; at?: Date; icon?: LucideIcon };

const CLOSED: PipelineStatus[] = ["REJECTED", "ARCHIVED", "HIRED"];

function timeOf(date: Date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isUpcoming(date: Date) {
  return date.getTime() >= Date.now();
}

function byDate(a: { at?: Date }, b: { at?: Date }) {
  return (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0);
}

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

/** Runs one load per screen, ignoring its result once the screen has gone. A failed load just leaves the list empty. */
function useLoad<T>(load: () => Promise<T>, enabled = true) {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load()
      .then((result) => {
        if (!cancelled) setValue(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; these screens load once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return value;
}

function accountTask(user: AuthUser | null): HomeItem[] {
  if (isVerified(user)) return [];
  return [
    {
      id: "verification",
      title: verificationLabel(user),
      detail: "Complétez votre dossier pour être vérifié.",
      note: "À faire",
      to: "/app/profile",
      icon: ShieldCheck,
    },
  ];
}

function interviewItems(rows: Recruitment[], withName: (row: Recruitment) => string, to: string): HomeItem[] {
  return rows
    .filter((row) => row.status === "INTERVIEW_SCHEDULED" && row.interviewAt && isUpcoming(new Date(row.interviewAt)))
    .map((row) => {
      const at = new Date(row.interviewAt as string);
      return { id: `interview-${row.id}`, at, title: `Entretien avec ${withName(row)}`, detail: `${timeOf(at)} · ${opportunityLabel(row)}`, to };
    })
    .sort(byDate);
}

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function mondayOf(date: Date) {
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return addDays(midnight, -((midnight.getDay() + 6) % 7));
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** One week at a time: pick a day to see what is planned. Opens on the next planned day. */
function WeekCalendar({ items }: { items: HomeItem[] }) {
  const [picked, setPicked] = useState<Date | null>(null);
  const events = items.filter((item): item is HomeItem & { at: Date } => Boolean(item.at)).sort(byDate);
  const today = new Date();
  const selected = picked ?? events[0]?.at ?? today;
  const monday = mondayOf(selected);
  const onDay = events.filter((event) => isSameDay(event.at, selected));
  const hidden = onDay.slice(3);

  return (
    <article className="mb-card mb-cal">
      <header className="mb-card-head">
        <h2>{selected.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2>
        <div className="mb-cal-arrows">
          <button type="button" aria-label="Semaine précédente" disabled={monday <= mondayOf(today)} onClick={() => setPicked(addDays(selected, -7))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Semaine suivante" onClick={() => setPicked(addDays(selected, 7))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mb-cal-week">
        {WEEK_DAYS.map((label, index) => {
          const day = addDays(monday, index);
          const planned = events.some((event) => isSameDay(event.at, day));
          const classes = ["mb-cal-day", isSameDay(day, selected) && "is-selected", isSameDay(day, today) && "is-today", planned && "is-planned"].filter(Boolean).join(" ");
          return (
            <button
              type="button"
              className={classes}
              key={label}
              aria-pressed={isSameDay(day, selected)}
              aria-label={`${day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${planned ? ", événement prévu" : ""}`}
              onClick={() => setPicked(day)}
            >
              <small>{label}</small>
              <b>{day.getDate()}</b>
            </button>
          );
        })}
      </div>

      {onDay.length ? (
        <ul className="mb-cal-list">
          {onDay.slice(0, 3).map((event) => (
            <li key={event.id}>
              <Link className="mb-cal-item" to={event.to}>
                <span className="mb-cal-icon">
                  <CalendarClock size={19} aria-hidden="true" />
                </span>
                <span className="mb-item-copy">
                  <strong>{event.title}</strong>
                  {event.detail ? <small>{event.detail}</small> : null}
                </span>
              </Link>
            </li>
          ))}
          {hidden.length ? (
            <li>
              <Link className="mb-more" to={hidden[0].to}>
                + {plural(hidden.length, "autre")}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="mb-empty">
          <img src="/illustrations/coach-agenda.png" alt="" />
          <p>Rien de prévu ce jour.</p>
        </div>
      )}
    </article>
  );
}

function HomeView({
  shortcuts,
  listTitle = "À faire",
  more,
  items,
  empty,
  emptyAction,
  calendar = false,
}: {
  shortcuts: Shortcut[];
  listTitle?: string;
  more?: string;
  items: HomeItem[];
  empty: string;
  emptyAction?: { to: string; label: string };
  /** For roles with dated items (bookings, interviews, sessions): the week view reads the dates in `items`. */
  calendar?: boolean;
}) {
  const { user } = useAuth();
  const { items: notifications, markRead } = useNotifications();
  const billing = useBilling();
  const firstName = user?.firstName || user?.displayName || "champion";
  const unread = notifications.filter((item) => !item.readAt).slice(0, 3);
  const shown = items.slice(0, 3);
  const subscription = billing?.subscription;
  const subscribed = subscription && subscription.status !== "CANCELLED" && subscription.status !== "EXPIRED";

  return (
    <section className="mb">
      <div className="mb-grid">
        <header className="mb-hero">
          <h1>Bonjour, {firstName} !</h1>
          <p>Que voulez-vous faire aujourd’hui ?</p>
        </header>

        {shortcuts.map((shortcut) => {
          const content: ReactNode = (
            <>
              <img src={`/illustrations/${shortcut.image}.png`} alt="" />
              <strong>{shortcut.label}</strong>
            </>
          );
          return shortcut.external ? (
            <a className="mb-tile" href={shortcut.to} target="_blank" rel="noreferrer" key={shortcut.to}>
              {content}
            </a>
          ) : (
            <Link className="mb-tile" to={shortcut.to} key={shortcut.to}>
              {content}
            </Link>
          );
        })}

        <article className="mb-card mb-upcoming">
          <header className="mb-card-head">
            <h2>{listTitle}</h2>
            {more && shown.length ? (
              <Link className="mb-more" to={more}>
                Tout voir
              </Link>
            ) : null}
          </header>
          {shown.length ? (
            <ul className="mb-list">
              {shown.map((item) => {
                const Icon = item.icon ?? FilePenLine;
                return (
                  <li key={item.id}>
                    <Link className="mb-item" to={item.to}>
                      <span className="mb-date">
                        {item.at ? (
                          <>
                            <b>{item.at.getDate()}</b>
                            {item.at.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                          </>
                        ) : (
                          <Icon size={22} aria-hidden="true" />
                        )}
                      </span>
                      <span className="mb-item-copy">
                        <strong>{item.title}</strong>
                        {item.detail ? <small>{item.detail}</small> : null}
                      </span>
                      {item.note ? <span className="mb-note">{item.note}</span> : null}
                      <ChevronRight className="mb-item-go" size={18} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mb-empty">
              <img src="/illustrations/coaching.png" alt="" />
              <p>{empty}</p>
              {emptyAction ? (
                <Link className="mb-btn" to={emptyAction.to}>
                  {emptyAction.label}
                </Link>
              ) : null}
            </div>
          )}
        </article>

        {calendar ? <WeekCalendar items={items} /> : null}

        <article className="mb-card mb-news">
          <header className="mb-card-head">
            <h2>Notifications</h2>
            <Link className="mb-more" to="/notifications">
              Tout voir
            </Link>
          </header>
          {unread.length ? (
            <ul className="mb-list">
              {unread.map((item) => (
                <li key={item.id}>
                  <Link className="mb-news-item" to={item.actionPath ?? "/notifications"} onClick={() => void markRead(item.id)}>
                    <strong>{item.title}</strong>
                    <small>{notificationTime(item.createdAt)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-empty">
              <img src="/illustrations/messages.png" alt="" />
              <p>Vous êtes à jour.</p>
            </div>
          )}
        </article>

        <Link className="mb-premium" to={subscribed ? "/app/billing" : "/app/profile/plan"}>
          <img src="/illustrations/go-premium.png" alt="" />
          <strong>{subscribed ? `Offre ${subscription.planName}` : "Passez Premium !"}</strong>
          <span>{subscribed ? "Gérer mon offre" : "En savoir plus"}</span>
        </Link>
      </div>
    </section>
  );
}

const MEMBER_BOOKING_NOTE: Partial<Record<Booking["status"], string>> = { PENDING: "En attente", AWAITING_PAYMENT: "À payer" };

const REGISTRATION_NOTE: Partial<Record<Registration["status"], string>> = {
  PENDING_PAYMENT: "À payer",
  PENDING_ON_SITE: "À payer sur place",
  WAITLISTED: "Liste d’attente",
};

function MemberHome({ user }: { user: AuthUser | null }) {
  const canCoach = hasPermission(user, PERMS.COACHING_DISCOVER);
  const canAcademy = hasPermission(user, PERMS.ACADEMY_BROWSE);
  const bookings = useLoad(fetchMyBookings, canCoach);
  const registrations = useLoad(fetchMyRegistrations, canAcademy);

  const items = useMemo(() => {
    const sessions: HomeItem[] = (bookings ?? [])
      .filter((booking) => ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status))
      .map((booking) => {
        const at = new Date(booking.scheduledAt);
        return {
          id: booking.id,
          at,
          title: booking.serviceName,
          detail: `${timeOf(at)} · ${booking.coachDisplayName ?? "Coach"}`,
          note: MEMBER_BOOKING_NOTE[booking.status],
          to: booking.status === "AWAITING_PAYMENT" ? `/app/coaching/bookings/${booking.id}/pay` : "/app/coaching/bookings",
        };
      });
    const formations: HomeItem[] = (registrations ?? [])
      .filter((registration) => registration.scheduledAt && registration.status !== "CANCELLED")
      .map((registration) => {
        const at = new Date(registration.scheduledAt as string);
        return {
          id: registration.id,
          at,
          title: registration.formationTitle,
          detail: `${timeOf(at)} · Formation`,
          note: REGISTRATION_NOTE[registration.status],
          to: "/app/academy/registrations",
        };
      });
    return [...sessions, ...formations].filter((item) => isUpcoming(item.at)).sort(byDate);
  }, [bookings, registrations]);

  const shortcuts: Shortcut[] = [];
  if (canCoach) {
    shortcuts.push({ to: "/coaches", image: "coaching", label: "Trouver un coach" }, { to: "/app/coaching/bookings", image: "member-dashboard", label: "Mes séances" });
  }
  if (canAcademy) shortcuts.push({ to: "/academie", image: "formation", label: "Académie" });

  return (
    <HomeView
      shortcuts={shortcuts}
      listTitle="À venir"
      more="/app/coaching/bookings"
      items={[...accountTask(user), ...items]}
      empty="Rien de prévu pour le moment."
      emptyAction={canCoach ? { to: "/coaches", label: "Réserver une séance" } : undefined}
      calendar={canCoach || canAcademy}
    />
  );
}

const APPLICATION_STEP: Partial<Record<PipelineStatus, string>> = {
  APPLIED: "Envoyée",
  NEW: "En étude",
  CONTACTED: "En étude",
  INTERVIEW_SCHEDULED: "Entretien",
  NEGOTIATION: "Entretien",
  CONTRACT_SENT: "Contrat",
};

/** Candidates and coaches, or both for an account that does both. */
function ProHome({ user }: { user: AuthUser | null }) {
  const isCoach = hasPermission(user, PERMS.COACHING_MANAGE);
  const canHire = hasPermission(user, PERMS.HIRE_APPLY);
  const canContracts = hasPermission(user, PERMS.HIRE_CONTRACTS_CANDIDATE);
  const { profile } = useOwnProfile();
  const rows = useLoad(fetchRecruitments, canHire);
  const contracts = useLoad(fetchContracts, canContracts);
  const bookings = useLoad(fetchCoachBookings, isCoach);

  const items = useMemo(() => {
    const toSign: HomeItem[] = (contracts ?? [])
      .filter((contract: Contract) => (contract.status === "SENT" || contract.status === "EMPLOYER_SIGNED") && !contract.candidateSignedAt)
      .map((contract) => ({ id: contract.id, title: contract.title, detail: contract.employerName, note: "À signer", to: `/contracts/${contract.id}`, icon: FileSignature }));
    const sessions: HomeItem[] = (bookings ?? [])
      .filter((booking) => (booking.status === "PENDING" || booking.status === "CONFIRMED") && isUpcoming(new Date(booking.scheduledAt)))
      .map((booking) => {
        const at = new Date(booking.scheduledAt);
        return {
          id: booking.id,
          at,
          title: booking.clientDisplayName ?? "Client",
          detail: `${timeOf(at)} · ${booking.serviceName}`,
          note: booking.status === "PENDING" ? "À confirmer" : undefined,
          to: "/app/coaching/agenda",
        };
      })
      .sort(byDate);
    const interviews = interviewItems(rows ?? [], (row) => row.employer?.displayName ?? "l’employeur", "/app/applications");
    const applications: HomeItem[] = (rows ?? [])
      .filter((row) => !CLOSED.includes(row.status) && row.status !== "INTERVIEW_SCHEDULED")
      .map((row) => ({
        id: row.id,
        title: opportunityLabel(row),
        detail: row.employer?.displayName ?? "Employeur",
        note: APPLICATION_STEP[row.status],
        to: "/app/applications",
        icon: BriefcaseBusiness,
      }));

    const missing = profile
      ? [
          !(profile.title && profile.city) && "titre et ville",
          !profile.biography && "présentation",
          profile.specialties.length === 0 && "spécialités",
          profile.experiences.length === 0 && "expérience",
          !profile.cv && "CV",
          profile.diplomas.length + profile.certifications.length === 0 && "diplôme ou certification",
          !profile.availability && "disponibilité",
        ].filter((label): label is string => Boolean(label))
      : [];
    const profileTask: HomeItem[] = missing.length
      ? [{ id: "profile", title: "Compléter mon profil", detail: `À ajouter : ${missing.slice(0, 2).join(", ")}${missing.length > 2 ? "…" : ""}`, to: "/app/profile/edit" }]
      : [];

    return [...accountTask(user), ...toSign, ...sessions.filter((item) => item.note), ...interviews, ...sessions.filter((item) => !item.note), ...profileTask, ...applications];
  }, [bookings, contracts, profile, rows, user]);

  const shortcuts: Shortcut[] = [];
  if (isCoach) shortcuts.push({ to: "/app/coaching/agenda", image: "coach-agenda", label: "Mon agenda" });
  if (canHire) {
    shortcuts.push({ to: "/app/opportunities", image: "opportunities", label: "Opportunités" }, { to: "/app/applications", image: "applications", label: "Mes candidatures" });
  }
  if (isCoach && !canHire) {
    shortcuts.push({ to: "/app/coaching/services", image: "coaching", label: "Mes services" }, { to: "/app/coaching/packs", image: "member-dashboard", label: "Mes packs" });
  }
  if (canHire && !isCoach && canContracts) shortcuts.push({ to: "/contracts", image: "contracts", label: "Mes contrats" });

  return (
    <HomeView
      shortcuts={shortcuts.slice(0, 3)}
      more={isCoach ? "/app/coaching/agenda" : "/app/applications"}
      items={items}
      empty={canHire ? "Aucune candidature en cours." : "Aucune séance à venir."}
      emptyAction={canHire ? { to: "/app/opportunities", label: "Voir les opportunités" } : { to: "/app/coaching/services", label: "Gérer mes services" }}
      calendar
    />
  );
}

function EmployerHome({ user }: { user: AuthUser | null }) {
  const billing = useBilling();
  const rows = useLoad(fetchRecruitments);
  const offers = useLoad<JobOffer[]>(fetchJobOffers);
  const contracts = useLoad(fetchContracts);
  const inbox = useLoad(fetchInboxCount);

  const items = useMemo(() => {
    const list: HomeItem[] = [...accountTask(user)];
    const waiting = inbox?.count ?? 0;
    if (waiting > 0) {
      list.push({ id: "inbox", title: `${plural(waiting, "candidature")} à examiner`, note: "Nouveau", to: "/applications", icon: Inbox });
    }
    (contracts ?? [])
      .filter((contract) => (contract.status === "SENT" || contract.status === "CANDIDATE_SIGNED") && Boolean(contract.candidateSignedAt) && !contract.employerSignedAt)
      .forEach((contract) => list.push({ id: contract.id, title: contract.candidateName, detail: contract.jobOffer?.title || contract.title, note: "À signer", to: `/contracts/${contract.id}`, icon: FileSignature }));
    list.push(...interviewItems(rows ?? [], (row) => row.candidate.displayName, "/applications"));
    const drafts = (offers ?? []).filter((offer) => offer.status !== "PUBLISHED").length;
    if (drafts > 0) {
      list.push({ id: "drafts", title: `${plural(drafts, "offre")} en brouillon`, detail: "Publiez-les pour recevoir des candidatures.", to: "/job-offers" });
    }
    if (offers && offers.length === 0 && can(billing, "hire.jobs")) {
      list.push({ id: "first-offer", title: "Publiez votre première offre", detail: "Recevez vos premières candidatures.", to: "/job-offers", icon: FilePlus2 });
    }
    return list;
  }, [billing, contracts, inbox, offers, rows, user]);

  return (
    <HomeView
      shortcuts={[
        { to: "/candidates", image: "recruitment", label: "Rechercher des talents" },
        { to: "/applications", image: "applications", label: "Candidatures" },
        { to: "/job-offers", image: "opportunities", label: "Offres d’emploi" },
      ]}
      more="/applications"
      items={items}
      empty="Rien à traiter pour le moment."
      emptyAction={{ to: "/candidates", label: "Rechercher des talents" }}
      calendar
    />
  );
}

function SupplierHome({ user }: { user: AuthUser | null }) {
  const conversations = useLoad(fetchConversations);
  const stats = useLoad(fetchSupplierStats);

  const items = useMemo(() => {
    const rows = [...(conversations ?? [])].sort((a: Conversation, b: Conversation) => b.unreadCount - a.unreadCount);
    const toItem = (row: Conversation): HomeItem => ({
      id: row.id,
      title: row.counterpart.displayName,
      detail: row.productName,
      note: row.unreadCount > 0 ? `${plural(row.unreadCount, "message")}` : undefined,
      to: `/app/marketplace/messages?c=${row.id}`,
      icon: MessagesSquare,
    });
    const drafts: HomeItem[] = stats?.drafts
      ? [{ id: "drafts", title: `${plural(stats.drafts, "article")} en brouillon`, detail: "Publiez-les pour les rendre visibles.", to: "/app/marketplace/mine", icon: PackageOpen }]
      : [];
    return [...accountTask(user), ...rows.filter((row) => row.unreadCount > 0).map(toItem), ...drafts, ...rows.filter((row) => row.unreadCount === 0).map(toItem)];
  }, [conversations, stats, user]);

  return (
    <HomeView
      shortcuts={[
        { to: "/app/marketplace/mine", image: "supplier-products", label: "Mes articles" },
        { to: "/app/marketplace/messages", image: "messages", label: "Messages" },
        { to: "/marketplace/products", image: "marketplace", label: "Voir la vitrine", external: true },
      ]}
      more="/app/marketplace/messages"
      items={items}
      empty="Aucun message pour le moment."
      emptyAction={{ to: "/app/marketplace/mine?new=1", label: "Ajouter un article" }}
    />
  );
}

function AcademyHome({ user }: { user: AuthUser | null }) {
  const sessions = useLoad(async () => {
    const formations = await fetchMyFormations();
    const lists = await Promise.all(
      formations.map((formation) => fetchMySessions(formation.id).then((rows) => rows.map((session) => ({ session, title: formation.title })))),
    );
    return lists.flat();
  });

  const items = useMemo(() => {
    const upcoming: HomeItem[] = (sessions ?? [])
      .filter(({ session }) => session.status === "SCHEDULED" && isUpcoming(new Date(session.scheduledAt)))
      .map(({ session, title }) => {
        const at = new Date(session.scheduledAt);
        return {
          id: session.id,
          at,
          title,
          detail: `${timeOf(at)} · ${session.confirmedCount}/${session.capacity} inscrits`,
          note: session.seatsLeft === 0 ? "Complet" : undefined,
          to: "/app/academy/formations",
        };
      })
      .sort(byDate);
    return [...accountTask(user), ...upcoming];
  }, [sessions, user]);

  return (
    <HomeView
      shortcuts={[
        { to: "/app/academy/formations", image: "formation", label: "Mes formations" },
        { to: "/app/academy/checkin", image: "verifications", label: "Contrôle d’entrée" },
        { to: "/app/profile", image: "users", label: "Mon profil" },
      ]}
      listTitle="À venir"
      more="/app/academy/formations"
      items={items}
      empty="Aucune session à venir."
      emptyAction={{ to: "/app/academy/formations", label: "Gérer mes formations" }}
      calendar
    />
  );
}

function ProviderHome({ user }: { user: AuthUser | null }) {
  const requests = useLoad<QuoteRequest[]>(fetchReceivedQuoteRequests);

  const items = useMemo(() => {
    const open: HomeItem[] = (requests ?? [])
      .filter((request) => request.status === "NEW")
      .map((request) => ({
        id: request.id,
        title: request.companyName,
        detail: request.requesterDisplayName ?? request.city ?? undefined,
        note: "Nouvelle",
        to: "/app/services/requests",
        icon: Inbox,
      }));
    return [...accountTask(user), ...open];
  }, [requests, user]);

  return (
    <HomeView
      shortcuts={[
        { to: "/app/services/mine", image: "services", label: "Mes services" },
        { to: "/app/services/requests", image: "applications", label: "Demandes reçues" },
        { to: "/app/profile", image: "users", label: "Mon profil" },
      ]}
      more="/app/services/requests"
      items={items}
      empty="Aucune nouvelle demande."
      emptyAction={{ to: "/app/services/mine", label: "Gérer mes services" }}
    />
  );
}

/** Organizers and creators: their modules are not open yet, so the page only says so and offers the account pages. */
function ModuleHome({ user, workspace, to, image, label }: { user: AuthUser | null; workspace: "events" | "content"; to: string; image: string; label: string }) {
  return (
    <HomeView
      shortcuts={[
        { to, image, label },
        { to: "/app/profile", image: "users", label: "Mon profil" },
        { to: "/app/billing", image: "subscriptions", label: "Abonnement" },
      ]}
      items={accountTask(user)}
      empty={WORKSPACES[workspace].empty}
    />
  );
}

/** Every account's home, except the super admin's. Same layout for all: only the shortcuts and the list change. */
export function HomeDashboard() {
  const { user } = useAuth();
  if (hasPermission(user, PERMS.HIRE_PIPELINE)) return <EmployerHome user={user} />;
  if (hasPermission(user, PERMS.HIRE_APPLY) || (hasPermission(user, PERMS.HIRE_PROFILE) && hasPermission(user, PERMS.COACHING_MANAGE))) {
    return <ProHome user={user} />;
  }
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) return <AcademyHome user={user} />;
  if (hasPermission(user, PERMS.MARKETPLACE_MANAGE)) return <SupplierHome user={user} />;
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) return <ProviderHome user={user} />;
  if (hasPermission(user, PERMS.EVENTS_MANAGE)) return <ModuleHome user={user} workspace="events" to="/app/events" image="events" label="Événements" />;
  if (hasPermission(user, PERMS.CONTENT_PUBLISH)) return <ModuleHome user={user} workspace="content" to="/app/content" image="news" label="Contenus" />;
  if (hasPermission(user, PERMS.COACHING_MANAGE)) return <ProHome user={user} />;
  return <MemberHome user={user} />;
}
