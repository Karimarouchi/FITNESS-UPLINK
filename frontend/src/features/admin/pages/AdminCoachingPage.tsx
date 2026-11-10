import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Search,
  ShieldAlert,
  Star,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { ModulePager } from "@/components/admin/ModulePager";
import { UsersModal } from "@/features/users/UsersModal";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { ApiError } from "@/shared/api/client";
import {
  fetchAdminBookings,
  fetchAdminCoaches,
  fetchAdminReports,
  resolveReport,
  type AdminCoachSummary,
  type Booking,
  type CoachingReport,
} from "@/features/coaching/api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

type Tab = "coaches" | "bookings" | "reports";

type StatusTone = "success" | "warn" | "danger" | "info" | "neutral";

/** Display labels only: the internal status values sent and received by the API are unchanged. */
const BOOKING_STATUS: Record<Booking["status"], { label: string; tone: StatusTone }> = {
  PENDING: { label: "En attente", tone: "warn" },
  AWAITING_PAYMENT: { label: "Paiement en attente", tone: "warn" },
  CONFIRMED: { label: "Confirmée", tone: "info" },
  DECLINED: { label: "Refusée", tone: "danger" },
  COMPLETED: { label: "Terminée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  NO_SHOW: { label: "Absent", tone: "danger" },
};

const BOOKING_FILTERS: { value: "ALL" | Booking["status"]; label: string }[] = [
  { value: "ALL", label: "Tous les statuts" },
  ...(Object.entries(BOOKING_STATUS) as [Booking["status"], { label: string }][]).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function AdminCoachingPage() {
  const [params] = useSearchParams();
  const requested = params.get("tab");
  const [tab, setTab] = useState<Tab>(requested === "reports" || requested === "bookings" ? requested : "coaches");
  const [coaches, setCoaches] = useState<AdminCoachSummary[] | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [reports, setReports] = useState<CoachingReport[] | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({});
  const [flash, setFlash] = useState<string | null>(null);

  function failed(key: Tab, message: string) {
    setErrors((current) => ({ ...current, [key]: message }));
  }

  useEffect(() => {
    fetchAdminCoaches()
      .then(setCoaches)
      .catch(() => {
        setCoaches([]);
        failed("coaches", "Impossible de charger les coachs.");
      });
    fetchAdminBookings()
      .then(setBookings)
      .catch(() => {
        setBookings([]);
        failed("bookings", "Impossible de charger les réservations.");
      });
    loadReports();
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  function loadReports() {
    fetchAdminReports()
      .then((rows) => {
        setReports(rows);
        setErrors((current) => ({ ...current, reports: undefined }));
      })
      .catch(() => {
        setReports((current) => current ?? []);
        failed("reports", "Impossible de charger les litiges.");
      });
  }

  const openReports = reports?.filter((item) => item.status === "OPEN").length ?? 0;
  const averageRating = useMemo(() => {
    const rated = (coaches ?? []).filter((item) => item.averageRating > 0);
    if (rated.length === 0) return null;
    return rated.reduce((sum, item) => sum + item.averageRating, 0) / rated.length;
  }, [coaches]);
  const loadingKpis = coaches === null || bookings === null || reports === null;

  return (
    <section className="bo-dash bo-users bo-bm bo-cc">
      <header className="bo-dash-head">
        <div>
          <h1>Coaching</h1>
          <p>Coachs, réservations et litiges du module coaching privé.</p>
        </div>
      </header>

      {flash ? (
        <div className="bo-users-alert" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Masquer le message">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="bo-dash-kpis">
        <Kpi icon={<Users size={22} />} tone="orange" label="Coachs" value={coaches?.length} hint="Comptes ayant activé le coaching" loading={loadingKpis} />
        <Kpi icon={<CalendarDays size={22} />} tone="blue" label="Réservations" value={bookings?.length} hint="Toutes réservations confondues" loading={loadingKpis} />
        <Kpi
          icon={<Star size={22} />}
          tone="neutral"
          label="Note moyenne"
          value={averageRating === null ? "—" : averageRating.toFixed(1)}
          hint="Moyenne des coachs notés"
          loading={loadingKpis}
        />
        <Kpi icon={<ShieldAlert size={22} />} tone="rose" label="Litiges ouverts" value={openReports} hint="À traiter par l’équipe" loading={loadingKpis} />
      </div>

      <div className="bo-dash-card bo-users-card">
        <div className="bo-users-toolbar">
          <div className="bo-users-tabs" role="tablist" aria-label="Sections du coaching">
            <TabButton id="coaches" current={tab} onSelect={setTab} count={coaches?.length}>
              Coachs
            </TabButton>
            <TabButton id="bookings" current={tab} onSelect={setTab} count={bookings?.length}>
              Réservations
            </TabButton>
            <TabButton id="reports" current={tab} onSelect={setTab} count={openReports > 0 ? openReports : undefined}>
              Litiges
            </TabButton>
          </div>
        </div>
        <div role="tabpanel" id={`cc-panel-${tab}`} aria-labelledby={`cc-tab-${tab}`}>
          {tab === "coaches" ? <CoachesTab coaches={coaches} error={errors.coaches} /> : null}
          {tab === "bookings" ? <BookingsTab bookings={bookings} error={errors.bookings} /> : null}
          {tab === "reports" ? (
            <ReportsTab
              reports={reports}
              error={errors.reports}
              onResolved={(message) => {
                setFlash(message);
                loadReports();
              }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  hint,
  loading,
}: {
  icon: React.ReactNode;
  tone: "orange" | "blue" | "rose" | "neutral";
  label: string;
  value: number | string | undefined;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="bo-dash-kpi">
      <span className={`bo-dash-icon${tone === "orange" ? "" : ` is-${tone}`}`}>{icon}</span>
      <span className="bo-dash-kpi-label">{label}</span>
      {loading ? (
        <span className="bo-skeleton bo-dash-kpi-skel" />
      ) : (
        <>
          <span className="bo-dash-kpi-value">{value ?? "—"}</span>
          <span className="bo-dash-kpi-meta">
            <small>{hint}</small>
          </span>
        </>
      )}
    </div>
  );
}

function TabButton({
  id,
  current,
  onSelect,
  count,
  children,
}: {
  id: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  count: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`cc-tab-${id}`}
      aria-selected={current === id}
      aria-controls={`cc-panel-${id}`}
      className={current === id ? "is-active" : ""}
      onClick={() => onSelect(id)}
    >
      {children}
      {count !== undefined ? <span>{count}</span> : null}
    </button>
  );
}

function SkeletonRows({ columns }: { columns: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((key) => (
        <tr key={key} className="is-skeleton" aria-hidden="true">
          <td colSpan={columns}>
            <div className="bo-skeleton bm-skel" />
          </td>
        </tr>
      ))}
    </>
  );
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bo-users-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function CoachesTab({ coaches, error }: { coaches: AdminCoachSummary[] | null; error?: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (coaches ?? []).filter(
      (item) => !term || item.displayName.toLowerCase().includes(term) || item.email.toLowerCase().includes(term),
    );
  }, [coaches, query]);
  const rows = filtered.slice(page * size, (page + 1) * size);

  return (
    <>
      <div className="bm-subbar">
        <label className="bo-users-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Rechercher un coach…"
            aria-label="Rechercher un coach"
          />
        </label>
      </div>
      {error ? (
        <p className="bo-dash-error bm-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="bm-table-wrap">
        <table className="bm-table">
          <caption className="bm-sr">Coachs</caption>
          <thead>
            <tr>
              <th scope="col">Coach</th>
              <th scope="col">Services</th>
              <th scope="col">Réservations</th>
              <th scope="col">Note</th>
              <th scope="col">Visibilité</th>
              <th scope="col" className="is-actions">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {coaches === null ? (
              <SkeletonRows columns={6} />
            ) : (
              rows.map((coach) => (
                <tr key={coach.id}>
                  <td>
                    <div className="bo-users-person">
                      <ProfileAvatar name={coach.displayName} size={40} />
                      <div>
                        <strong>{coach.displayName}</strong>
                        <small>{coach.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="is-number">{coach.servicesCount}</td>
                  <td className="is-number">{coach.bookingsCount}</td>
                  <td>
                    {coach.averageRating > 0 ? (
                      <span className="bm-rating">
                        <Star size={15} aria-hidden="true" />
                        {coach.averageRating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="bo-users-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`bo-users-status ${coach.profileVisible ? "is-success" : "is-neutral"}`}>
                      {coach.profileVisible ? "Visible" : "Non visible"}
                    </span>
                  </td>
                  <td className="is-actions">
                    <Link to={`/coaches/${coach.id}`} className="bm-link" aria-label={`Voir le profil de ${coach.displayName}`}>
                      Voir profil
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {coaches !== null && !error && filtered.length === 0 ? (
          <Empty
            icon={<Dumbbell size={22} aria-hidden="true" />}
            title={query ? "Aucun résultat" : "Aucun coach"}
            text={query ? "Aucun coach ne correspond à cette recherche." : "Aucun compte n’a encore activé le coaching."}
          />
        ) : null}
      </div>
      <ModulePager
        total={filtered.length}
        page={page}
        size={size}
        noun="coach"
        onPage={setPage}
        onSize={(next) => {
          setSize(next);
          setPage(0);
        }}
      />
    </>
  );
}

function BookingsTab({ bookings, error }: { bookings: Booking[] | null; error?: string }) {
  const [status, setStatus] = useState<"ALL" | Booking["status"]>("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // the API returns the whole list; the page keeps showing the first 200 as before
  const all = useMemo(() => (bookings ?? []).slice(0, 200), [bookings]);
  const filtered = useMemo(() => all.filter((item) => status === "ALL" || item.status === status), [all, status]);
  const rows = filtered.slice(page * size, (page + 1) * size);

  return (
    <>
      <div className="bm-subbar">
        <DashSelect
          label="Statut"
          value={status}
          options={BOOKING_FILTERS}
          onChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
          align="left"
        />
      </div>
      {error ? (
        <p className="bo-dash-error bm-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="bm-table-wrap">
        <table className="bm-table">
          <caption className="bm-sr">Réservations</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Coach</th>
              <th scope="col">Client</th>
              <th scope="col">Service</th>
              <th scope="col">Statut</th>
              <th scope="col" className="is-actions">
                Montant
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings === null ? (
              <SkeletonRows columns={6} />
            ) : (
              rows.map((booking) => {
                const meta = BOOKING_STATUS[booking.status] ?? { label: booking.status, tone: "neutral" as StatusTone };
                return (
                  <tr key={booking.id}>
                    <td className="is-date">{formatDate(booking.scheduledAt)}</td>
                    <td>{booking.coachDisplayName ?? <span className="bo-users-muted">—</span>}</td>
                    <td>{booking.clientDisplayName ?? <span className="bo-users-muted">—</span>}</td>
                    <td>{booking.serviceName}</td>
                    <td>
                      <span className={`bo-users-status is-${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="is-actions is-number">
                      {booking.packId ? <span className="bo-users-role is-violet">Pack</span> : `${booking.priceAmount} ${booking.priceCurrency}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {bookings !== null && !error && filtered.length === 0 ? (
          <Empty
            icon={<CalendarDays size={22} aria-hidden="true" />}
            title={status === "ALL" ? "Aucune réservation" : "Aucun résultat"}
            text={status === "ALL" ? "Aucune réservation pour l’instant." : "Aucune réservation ne correspond à ce statut."}
          />
        ) : null}
      </div>
      <ModulePager
        total={filtered.length}
        page={page}
        size={size}
        noun="réservation"
        onPage={setPage}
        onSize={(next) => {
          setSize(next);
          setPage(0);
        }}
      />
    </>
  );
}

function ReportsTab({
  reports,
  error,
  onResolved,
}: {
  reports: CoachingReport[] | null;
  error?: string;
  onResolved: (message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<CoachingReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function resolve(report: CoachingReport) {
    setBusyId(report.id);
    setFailure(null);
    try {
      await resolveReport(report.id, note[report.id]);
      setConfirm(null);
      onResolved("Litige marqué comme traité.");
    } catch (err) {
      setConfirm(null);
      setFailure(err instanceof ApiError ? err.message : "Impossible de résoudre ce litige.");
    } finally {
      setBusyId(null);
    }
  }

  const open = (reports ?? []).filter((item) => item.status === "OPEN");
  const resolved = (reports ?? []).filter((item) => item.status === "RESOLVED");
  const message = failure ?? error;

  return (
    <>
      {message ? (
        <p className="bo-dash-error bm-inline-error" role="alert">
          {message}
        </p>
      ) : null}
      {reports === null ? (
        <div className="cc-reports" aria-hidden="true">
          <div className="bo-skeleton bm-skel" />
          <div className="bo-skeleton bm-skel" />
        </div>
      ) : (
        <>
          <section className="cc-group" aria-label="Litiges ouverts">
            <h3 className="cc-group-head">
              Litiges ouverts <span>{open.length}</span>
            </h3>
            {open.length === 0 ? (
              <Empty
                icon={<ShieldAlert size={22} aria-hidden="true" />}
                title="Aucun litige ouvert"
                text="Les signalements des coachs et des clients apparaîtront ici."
              />
            ) : (
              <ul className="cc-reports">
                {open.map((report) => (
                  <li key={report.id} className="cc-report">
                    <div className="cc-report-head">
                      <div className="bo-users-person">
                        <ProfileAvatar name={report.reporterDisplayName} size={40} />
                        <div>
                          <strong>{report.reporterDisplayName}</strong>
                          <small>
                            Signalé le {formatDate(report.createdAt)} · Réservation n° {report.bookingId.slice(0, 8)}
                          </small>
                        </div>
                      </div>
                      <span className="bo-users-status is-warn">Ouvert</span>
                    </div>
                    <p className="cc-reason">{report.reason}</p>
                    <div className="cc-resolve">
                      <input
                        className="bm-input"
                        placeholder="Note admin (optionnel)"
                        aria-label={`Note admin pour le litige de ${report.reporterDisplayName}`}
                        value={note[report.id] ?? ""}
                        onChange={(event) => setNote({ ...note, [report.id]: event.target.value })}
                      />
                      <button type="button" className="bm-btn" disabled={busyId === report.id} onClick={() => setConfirm(report)}>
                        Marquer traité
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="cc-group" aria-label="Litiges traités">
            <h3 className="cc-group-head">
              Litiges traités <span>{resolved.length}</span>
            </h3>
            {resolved.length === 0 ? (
              <p className="cc-none">Aucun litige traité pour l’instant.</p>
            ) : (
              <ul className="cc-reports">
                {resolved.map((report) => (
                  <li key={report.id} className="cc-report">
                    <div className="cc-report-head">
                      <div className="bo-users-person">
                        <ProfileAvatar name={report.reporterDisplayName} size={40} />
                        <div>
                          <strong>{report.reporterDisplayName}</strong>
                          <small>
                            Signalé le {formatDate(report.createdAt)} · Réservation n° {report.bookingId.slice(0, 8)}
                          </small>
                        </div>
                      </div>
                      <span className="bo-users-status is-success">Traité</span>
                    </div>
                    <p className="cc-reason">{report.reason}</p>
                    {report.adminNote ? (
                      <p className="cc-note">
                        <strong>Note admin :</strong> {report.adminNote}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {confirm ? (
        <UsersModal
          title="Marquer ce litige comme traité ?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="um-btn" data-autofocus onClick={() => setConfirm(null)}>
                Annuler
              </button>
              <button type="button" className="um-btn is-primary" disabled={busyId === confirm.id} onClick={() => void resolve(confirm)}>
                Marquer traité
              </button>
            </>
          }
        >
          <div className="um-warning">
            <span aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <p>
              Le litige de <strong>{confirm.reporterDisplayName}</strong> sera clôturé avec la note saisie. Cette action ne rembourse pas et
              n’annule pas la réservation concernée.
            </p>
          </div>
        </UsersModal>
      ) : null}
    </>
  );
}
