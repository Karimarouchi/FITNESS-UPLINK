import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessagesSquare, Package, ShieldCheck, Store, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import type { AuthUser } from "@/features/auth/types";
import { fetchVerifications, type VerificationAccount } from "@/features/admin/api";
import { fetchUsers } from "@/features/users/api";
import { fetchAdminMarketplaceStats, type AdminMarketplaceStats } from "@/features/marketplace/api";
import { compactNumber, timeAgo } from "@/features/marketplace/format";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { lucideFor } from "@/components/layout/shell/navIcons";
import { ADMIN_CONFIG, ADMIN_MODULES } from "./adminNav";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const BAR_COLORS = ["#1d4ed8", "#0891b2", "#7c3aed", "#059669", "#d97706", "#db2777", "#64748b"];

export function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [pending, setPending] = useState<VerificationAccount[]>([]);
  const [market, setMarket] = useState<AdminMarketplaceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => {
        setUsers([]);
        setError("Impossible de charger les utilisateurs.");
      });
    fetchVerifications("all", "pending").then(setPending).catch(() => setPending([]));
    fetchAdminMarketplaceStats().then(setMarket).catch(() => setMarket(null));
  }, []);

  const list = useMemo(() => users ?? [], [users]);
  const newThisWeek = list.filter((item) => Date.now() - new Date(item.createdAt).getTime() < WEEK).length;
  const recent = useMemo(
    () => [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [list],
  );
  const roles = useMemo(() => {
    const counts = new Map<string, number>();
    list.forEach((item) => {
      const label = item.role?.label ?? "Sans rôle";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [list]);
  const maxRole = roles[0]?.[1] ?? 1;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section className="bo-page">
      <div className="bo-welcome">
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1>Bonjour {user?.firstName || "Admin"}</h1>
          <p>
            {today.charAt(0).toUpperCase() + today.slice(1)} — voici l’activité de la plateforme Fitness Uplink.
          </p>
        </div>
        <div className="bo-welcome-actions">
          <Link className="bo-btn" to="/admin/verifications">
            <ShieldCheck size={16} />
            Vérifications
          </Link>
          <Link className="bo-btn bo-btn--primary" to="/users">
            <Users size={16} />
            Gérer les utilisateurs
          </Link>
        </div>
      </div>

      {error ? <p className="bo-error">{error}</p> : null}

      <div className="bo-kpis">
        <Link className="bo-kpi" to="/users">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Utilisateurs</span>
            <span className="bo-kpi-icon">
              <Users size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{users ? compactNumber(list.length) : "—"}</div>
          <div className="bo-kpi-hint">
            <UserPlus size={12} style={{ verticalAlign: "-1px" }} /> {newThisWeek} inscrit{newThisWeek > 1 ? "s" : ""} cette semaine
          </div>
        </Link>
        <Link className="bo-kpi" to="/admin/verifications">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Vérifications en attente</span>
            <span className={pending.length ? "bo-kpi-icon is-amber" : "bo-kpi-icon is-green"}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{pending.length}</div>
          <div className="bo-kpi-hint">{pending.length ? "Dossiers à examiner" : "Aucun dossier en attente"}</div>
        </Link>
        <Link className="bo-kpi" to="/admin/marketplace">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Articles marketplace</span>
            <span className="bo-kpi-icon is-violet">
              <Package size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{market ? compactNumber(market.visible) : "—"}</div>
          <div className="bo-kpi-hint">
            {market ? `${market.hidden} masqué${market.hidden > 1 ? "s" : ""} · ${market.activeSuppliers} fournisseurs actifs` : "En ligne"}
          </div>
        </Link>
        <Link className="bo-kpi" to="/admin/marketplace">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Conversations acheteurs</span>
            <span className="bo-kpi-icon is-green">
              <MessagesSquare size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{market ? compactNumber(market.conversations) : "—"}</div>
          <div className="bo-kpi-hint">{market ? `+${market.newConversations7d} sur 7 jours` : "Marketplace"}</div>
        </Link>
      </div>

      <div className="bo-grid-2">
        <div className="bo-card">
          <div className="bo-card-head">
            <div>
              <h2>Inscriptions récentes</h2>
              <p>Derniers comptes créés sur la plateforme</p>
            </div>
            <Link className="bo-card-link" to="/users">
              Tous les utilisateurs <ArrowRight size={14} />
            </Link>
          </div>
          {users === null ? (
            <div className="bo-card-body bo-stack">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="bo-skeleton" style={{ height: 44 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="bo-empty">
              <p>Aucun utilisateur pour le moment.</p>
            </div>
          ) : (
            <ul className="bo-list">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link className="bo-list-item" to={`/users?q=${encodeURIComponent(item.email)}`}>
                    <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName || item.email} size={36} />
                    <div className="bo-list-main">
                      <div className="bo-list-title">
                        <span>{item.displayName || `${item.firstName} ${item.lastName}`.trim() || item.email}</span>
                        {item.verificationStatus === "verified" ? <span className="bo-pill is-success no-dot">Vérifié</span> : null}
                        {item.enabled === false ? <span className="bo-pill is-danger no-dot">Bloqué</span> : null}
                      </div>
                      <div className="bo-list-sub">
                        {[item.role?.label, item.country?.name, item.email].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <span className="bo-list-meta">{timeAgo(item.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="bo-card">
            <div className="bo-card-head">
              <h2>Répartition par rôle</h2>
            </div>
            <div className="bo-card-body bo-stack">
              {roles.length === 0 ? (
                <p style={{ margin: 0, color: "var(--bo-muted)", fontSize: 13.5 }}>Pas encore de données.</p>
              ) : (
                roles.map(([label, count], index) => (
                  <div key={label}>
                    <div className="bo-stat-row">
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bo-bar">
                      <span style={{ width: `${Math.max(4, (count / maxRole) * 100)}%`, background: BAR_COLORS[index % BAR_COLORS.length] }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bo-card">
            <div className="bo-card-head">
              <h2>À vérifier</h2>
              <Link className="bo-card-link" to="/admin/verifications">
                Ouvrir <ArrowRight size={14} />
              </Link>
            </div>
            {pending.length === 0 ? (
              <div className="bo-empty" style={{ padding: "28px 20px" }}>
                <div className="bo-empty-icon" style={{ background: "var(--bo-success-soft)", color: "var(--bo-success)" }}>
                  <ShieldCheck size={22} />
                </div>
                <p>Tous les dossiers ont été traités.</p>
              </div>
            ) : (
              <ul className="bo-list">
                {pending.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link className="bo-list-item" to="/admin/verifications">
                      <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName || item.email} size={32} />
                      <div className="bo-list-main">
                        <div className="bo-list-title">
                          <span>{item.displayName || item.email}</span>
                        </div>
                        <div className="bo-list-sub">{item.role?.label ?? "—"}</div>
                      </div>
                      <span className="bo-pill is-warn">En attente</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="bo-card" style={{ marginTop: 16 }}>
        <div className="bo-card-head">
          <div>
            <h2>Accès rapide</h2>
            <p>Modules et configuration de la plateforme</p>
          </div>
          <Link className="bo-card-link" to="/admin/config">
            Configuration <ArrowRight size={14} />
          </Link>
        </div>
        <div className="bo-quick">
          {[...ADMIN_MODULES, ...ADMIN_CONFIG.slice(0, 5)].map((item) => {
            const Icon = item.slug === "marketplace" ? Store : lucideFor(item.icon);
            return (
              <Link className="bo-quick-item" to={item.path} key={item.path}>
                <span className="bo-kpi-icon is-slate">
                  <Icon size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="bo-quick-title">{item.title}</div>
                  <div className="bo-quick-sub">{item.lead}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
