import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { Panel } from "@/components/ui/Panel";
import { fetchVerifications } from "@/features/admin/api";
import { fetchUsers } from "@/features/users/api";
import { ADMIN_CONFIG, ADMIN_MODULES } from "./adminNav";

export function AdminDashboard() {
  const [users, setUsers] = useState(0);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchUsers(), fetchVerifications("all", "pending")])
      .then(([allUsers, checks]) => {
        setUsers(allUsers.length);
        setPending(checks.length);
      })
      .catch(() => setError("Impossible de charger le back-office."));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <Badge>Administrateur — back-office</Badge>
          <div className="sub">Utilisateurs, abonnements, revenus, vérifications, réservations, événements, formations</div>
        </div>
      </div>
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="cards-row dense">
        <KpiCard label="Utilisateurs" value={String(users)} delta="Comptes en base" />
        <KpiCard label="Abonnements" value="0" delta="Module non branché" />
        <KpiCard label="Revenus" value="0" delta="Module non branché" />
        <KpiCard label="Vérifications" value={String(pending)} delta="Dossiers en attente" />
        <KpiCard label="Réservations" value="0" delta="Module non branché" />
        <KpiCard label="Événements" value="0" delta="Module non branché" />
        <KpiCard label="Formations" value="0" delta="Module non branché" />
      </div>
      <Panel title="Modules">
        <div className="admin-tiles in-panel">
          <Link className="admin-tile" to="/users">
            <div className="t">Utilisateurs</div>
            <div className="s">{users} compte{users > 1 ? "s" : ""} inscrit{users > 1 ? "s" : ""}</div>
          </Link>
          <Link className="admin-tile" to="/admin/verifications">
            <div className="t">Vérifications</div>
            <div className="s">{pending} dossier{pending > 1 ? "s" : ""} en attente</div>
          </Link>
          {ADMIN_MODULES.map((item) => (
            <Link className="admin-tile" to={item.path} key={item.slug}>
              <div className="t">{item.title}</div>
              <div className="s">{item.lead}</div>
            </Link>
          ))}
        </div>
      </Panel>
      <Panel title="Configuration" actionLabel="Tout voir" actionTo="/admin/config">
        <div className="admin-tiles in-panel">
          {ADMIN_CONFIG.map((item) => (
            <Link className="admin-tile" to={item.path} key={item.slug}>
              <div className="t">{item.title}</div>
              <div className="s">{item.lead}</div>
            </Link>
          ))}
        </div>
      </Panel>
    </section>
  );
}
