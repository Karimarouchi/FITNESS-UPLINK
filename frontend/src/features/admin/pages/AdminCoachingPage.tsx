import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
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

type Tab = "coaches" | "bookings" | "reports";

export function AdminCoachingPage() {
  const [tab, setTab] = useState<Tab>("coaches");
  const openReportsCount = useOpenReportsCount();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Coaching</h1>
          <div className="sub">Coachs, réservations et litiges du module coaching privé</div>
        </div>
      </div>

      <div className="meta-bar" style={{ justifyContent: "flex-start", padding: "0 0 18px" }}>
        <button type="button" className={tab === "coaches" ? "active" : ""} onClick={() => setTab("coaches")}>
          Coachs
        </button>
        <button type="button" className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>
          Réservations
        </button>
        <button type="button" className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>
          Litiges{openReportsCount > 0 ? ` (${openReportsCount})` : ""}
        </button>
      </div>

      {tab === "coaches" ? <CoachesTab /> : null}
      {tab === "bookings" ? <BookingsTab /> : null}
      {tab === "reports" ? <ReportsTab /> : null}
    </section>
  );
}

function useOpenReportsCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    fetchAdminReports()
      .then((rows) => setCount(rows.filter((r) => r.status === "OPEN").length))
      .catch(() => setCount(0));
  }, []);
  return count;
}

function CoachesTab() {
  const [coaches, setCoaches] = useState<AdminCoachSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminCoaches()
      .then(setCoaches)
      .catch(() => setError("Impossible de charger les coachs."));
  }, []);

  return (
    <Panel title={`${coaches.length} coach(s)`}>
      {error ? <p className="empty-hint">{error}</p> : null}
      {!error && coaches.length === 0 ? <p className="empty-hint">Aucun compte n’a encore activé le coaching.</p> : null}
      {coaches.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Coach</th>
              <th>E-mail</th>
              <th>Services</th>
              <th>Réservations</th>
              <th>Note</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coaches.map((coach) => (
              <tr key={coach.id}>
                <td>{coach.displayName}</td>
                <td>{coach.email}</td>
                <td>{coach.servicesCount}</td>
                <td>{coach.bookingsCount}</td>
                <td>{coach.averageRating > 0 ? coach.averageRating.toFixed(1) : "—"}</td>
                <td>
                  <StatusPill tone={coach.profileVisible ? "verified" : "pending"}>
                    {coach.profileVisible ? "Visible" : "Non visible"}
                  </StatusPill>
                </td>
                <td>
                  <Link to={`/coaches/${coach.id}`}>Voir profil</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Panel>
  );
}

function BookingsTab() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminBookings()
      .then(setBookings)
      .catch(() => setError("Impossible de charger les réservations."));
  }, []);

  return (
    <Panel title={`${bookings.length} réservation(s)`}>
      {error ? <p className="empty-hint">{error}</p> : null}
      {!error && bookings.length === 0 ? <p className="empty-hint">Aucune réservation pour l’instant.</p> : null}
      {bookings.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Coach</th>
              <th>Client</th>
              <th>Service</th>
              <th>Statut</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {bookings.slice(0, 200).map((b) => (
              <tr key={b.id}>
                <td>{new Date(b.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{b.coachDisplayName ?? "—"}</td>
                <td>{b.clientDisplayName ?? "—"}</td>
                <td>{b.serviceName}</td>
                <td>{b.status}</td>
                <td>{b.packId ? "Pack" : `${b.priceAmount} ${b.priceCurrency}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Panel>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<CoachingReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  function load() {
    fetchAdminReports()
      .then(setReports)
      .catch(() => setError("Impossible de charger les litiges."));
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string) {
    setBusyId(id);
    try {
      await resolveReport(id, note[id]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de résoudre ce litige.");
    } finally {
      setBusyId(null);
    }
  }

  const open = reports.filter((r) => r.status === "OPEN");
  const resolved = reports.filter((r) => r.status === "RESOLVED");

  return (
    <>
      <Panel title={`Litiges ouverts (${open.length})`}>
        {error ? <p className="empty-hint">{error}</p> : null}
        {open.length === 0 ? <p className="empty-hint">Aucun litige ouvert.</p> : null}
        {open.map((report) => (
          <div key={report.id} className="exp-item">
            <div className="exp-body">
              <div className="t">{report.reporterDisplayName}</div>
              <div className="d">{report.reason}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  placeholder="Note admin (optionnel)"
                  value={note[report.id] ?? ""}
                  onChange={(e) => setNote({ ...note, [report.id]: e.target.value })}
                  style={{ flex: 1 }}
                />
                <Button variant="primary" disabled={busyId === report.id} onClick={() => void resolve(report.id)}>
                  Marquer traité
                </Button>
              </div>
            </div>
          </div>
        ))}
      </Panel>
      <Panel title={`Litiges traités (${resolved.length})`}>
        {resolved.length === 0 ? (
          <p className="empty-hint">Aucun litige traité pour l’instant.</p>
        ) : (
          resolved.map((report) => (
            <div key={report.id} className="exp-item">
              <div className="exp-body">
                <div className="t">{report.reporterDisplayName}</div>
                <div className="d">{report.reason}</div>
                {report.adminNote ? <div className="d">Note admin : {report.adminNote}</div> : null}
              </div>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}
