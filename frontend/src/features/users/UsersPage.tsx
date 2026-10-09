import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, Ban, CircleCheck, History, Lock, Search, Trash2, Unlock, UserCheck, Users } from "lucide-react";
import { BoModal } from "@/components/ui/BoOverlay";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isSuperAdmin, isVerified, type AuthUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { formatPipelineDate } from "@/features/recruitment/api";
import { bulkUserAction, deleteUser, fetchUserActivity, fetchUsers, setUserEnabled, type AuditLogEntry } from "./api";

type AccountFilter = "all" | "active" | "blocked";

const FILTERS: { id: AccountFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "active", label: "Actifs" },
  { id: "blocked", label: "Bloqués" },
];

function isActive(user: AuthUser) {
  return user.enabled !== false;
}

function canManage(actorId: string | undefined, user: AuthUser) {
  return Boolean(actorId) && user.id !== actorId && !isSuperAdmin(user);
}

function statusTone(user: AuthUser) {
  if (!isActive(user)) {
    return "refused" as const;
  }
  if (isVerified(user)) {
    return "verified" as const;
  }
  if (user.verificationStatus === "rejected") {
    return "refused" as const;
  }
  return "pending" as const;
}

const PILL_TONE = {
  refused: "is-danger",
  verified: "is-success",
  pending: "is-warn",
} as const;

function statusLabel(user: AuthUser) {
  if (!isActive(user)) {
    return "Bloqué";
  }
  if (isVerified(user)) {
    return "Vérifié";
  }
  if (user.verificationStatus === "rejected") {
    return "Refusé";
  }
  return "En attente";
}

export function UsersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; names: string } | null>(null);
  const [activityUser, setActivityUser] = useState<AuthUser | null>(null);
  const [activityEntries, setActivityEntries] = useState<AuditLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasPermission(user, PERMS.ADMIN_USERS)) {
      return;
    }
    fetchUsers()
      .then((list) => {
        setUsers(list);
        setError(null);
      })
      .catch(() => setError("Impossible de charger les utilisateurs."));
  }, [user]);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => {
      if (item.role) map.set(item.role.code, item.role.label);
    });
    return [...map.entries()].map(([code, label]) => ({ code, label })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [users]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((item) => {
      if (filter === "active" && !isActive(item)) {
        return false;
      }
      if (filter === "blocked" && isActive(item)) {
        return false;
      }
      if (roleFilter && (item.role?.code ?? "") !== roleFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [item.displayName, item.email, item.role?.label, item.country?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [users, query, filter, roleFilter]);

  const selectableIds = useMemo(
    () => filtered.filter((item) => canManage(user?.id, item)).map((item) => item.id),
    [filtered, user?.id],
  );
  const selectedVisible = selected.filter((id) => selectableIds.includes(id));
  const allSelected = selectableIds.length > 0 && selectedVisible.length === selectableIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    setSelected((current) => current.filter((id) => users.some((item) => item.id === id)));
  }, [users]);

  if (!hasPermission(user, PERMS.ADMIN_USERS)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const blockedCount = users.filter((item) => !isActive(item)).length;
  const activeCount = users.length - blockedCount;

  function toggleOne(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? selected.filter((id) => !selectableIds.includes(id)) : [...new Set([...selected, ...selectableIds])]);
  }

  async function reload() {
    const list = await fetchUsers();
    setUsers(list);
    setSelected([]);
  }

  async function block(ids: string[], enabled: boolean) {
    if (!ids.length || busy) {
      return;
    }
    setBusy(true);
    try {
      if (ids.length === 1) {
        const updated = await setUserEnabled(ids[0], enabled);
        setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setSelected((current) => current.filter((id) => id !== updated.id));
      } else {
        const result = await bulkUserAction(ids, enabled ? "UNBLOCK" : "BLOCK");
        await reload();
        setFlash(
          enabled
            ? `${result.processed} compte${result.processed > 1 ? "s" : ""} débloqué${result.processed > 1 ? "s" : ""}.`
            : `${result.processed} compte${result.processed > 1 ? "s" : ""} bloqué${result.processed > 1 ? "s" : ""}.`,
        );
      }
      if (ids.length === 1) {
        const target = users.find((item) => item.id === ids[0]);
        const name = target?.displayName || target?.email || "ce compte";
        setFlash(enabled ? `${name} a été débloqué.` : `${name} a été bloqué.`);
      }
      setError(null);
    } catch {
      setError(enabled ? "Impossible de débloquer ce compte." : "Impossible de bloquer ce compte.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndDelete() {
    if (!confirmDelete || busy) {
      return;
    }
    const ids = confirmDelete.ids;
    setBusy(true);
    try {
      if (ids.length === 1) {
        await deleteUser(ids[0]);
        setUsers((current) => current.filter((item) => item.id !== ids[0]));
        setSelected((current) => current.filter((id) => id !== ids[0]));
        setFlash(`${confirmDelete.names} a été supprimé.`);
      } else {
        const result = await bulkUserAction(ids, "DELETE");
        await reload();
        setFlash(`${result.processed} compte${result.processed > 1 ? "s" : ""} supprimé${result.processed > 1 ? "s" : ""}.`);
      }
      setError(null);
      setConfirmDelete(null);
    } catch {
      setError("Impossible de supprimer ce compte.");
    } finally {
      setBusy(false);
    }
  }

  function askDelete(ids: string[]) {
    const names = users
      .filter((item) => ids.includes(item.id))
      .map((item) => item.displayName || item.email)
      .slice(0, 3)
      .join(", ");
    const extra = ids.length > 3 ? ` et ${ids.length - 3} autre${ids.length - 3 > 1 ? "s" : ""}` : "";
    setConfirmDelete({ ids, names: names + extra });
  }

  async function openActivity(target: AuthUser) {
    setActivityUser(target);
    setActivityEntries([]);
    setActivityError(null);
    setActivityLoading(true);
    try {
      const result = await fetchUserActivity(target.id);
      setActivityEntries(result.items);
    } catch {
      setActivityError("Impossible de charger l'activité de ce compte.");
    } finally {
      setActivityLoading(false);
    }
  }

  function closeActivity() {
    setActivityUser(null);
    setActivityEntries([]);
    setActivityError(null);
  }

  const verifiedCount = users.filter((item) => isVerified(item)).length;
  const shown = filtered;

  return (
    <section className="bo-page">
      <div className="bo-head">
        <div>
          <h1>Utilisateurs</h1>
          <p>Tous les comptes de la plateforme : rôles, statut de vérification, blocage et historique d’activité.</p>
        </div>
      </div>

      <div className="bo-kpis">
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Comptes inscrits</span>
            <span className="bo-kpi-icon">
              <Users size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{users.length}</div>
        </div>
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Actifs</span>
            <span className="bo-kpi-icon is-green">
              <UserCheck size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{activeCount}</div>
        </div>
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Vérifiés</span>
            <span className="bo-kpi-icon is-violet">
              <BadgeCheck size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{verifiedCount}</div>
        </div>
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Bloqués</span>
            <span className="bo-kpi-icon is-rose">
              <Ban size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{blockedCount}</div>
        </div>
      </div>

      {flash ? (
        <div className="bo-alert" style={{ marginBottom: 14 }}>
          <CircleCheck size={18} />
          <div>{flash}</div>
        </div>
      ) : null}
      {error ? <p className="bo-error">{error}</p> : null}

      <div className="bo-card">
        {selectedVisible.length > 0 ? (
          <div className="bo-toolbar" style={{ background: "var(--bo-primary-soft)" }}>
            <strong style={{ fontSize: 13.5, color: "var(--bo-primary)" }}>
              {selectedVisible.length} sélectionné{selectedVisible.length > 1 ? "s" : ""}
            </strong>
            <div className="bo-toolbar-spacer" />
            <button type="button" className="bo-btn bo-btn--sm" disabled={busy} onClick={() => void block(selectedVisible, false)}>
              <Ban size={14} />
              Bloquer
            </button>
            <button type="button" className="bo-btn bo-btn--sm" disabled={busy} onClick={() => void block(selectedVisible, true)}>
              <Unlock size={14} />
              Débloquer
            </button>
            <button type="button" className="bo-btn bo-btn--sm bo-btn--danger" disabled={busy} onClick={() => askDelete(selectedVisible)}>
              <Trash2 size={14} />
              Supprimer
            </button>
            <button type="button" className="bo-btn bo-btn--sm bo-btn--ghost" onClick={() => setSelected([])}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="bo-toolbar">
            <div className="bo-seg" role="tablist" aria-label="Filtrer les utilisateurs">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "is-active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  <span className="bo-seg-count">
                    {item.id === "all" ? users.length : item.id === "active" ? activeCount : blockedCount}
                  </span>
                </button>
              ))}
            </div>
            <div className="bo-toolbar-search">
              <Search size={16} />
              <input
                className="bo-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, e-mail, pays…"
              />
            </div>
            <div className="bo-toolbar-spacer" />
            <select className="bo-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Rôle">
              <option value="">Tous les rôles</option>
              {roleOptions.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bo-table-wrap">
          <table className="bo-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Pays</th>
                <th>Statut</th>
                <th>Inscrit</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="bo-empty">
                      <div className="bo-empty-icon">
                        <Users size={22} />
                      </div>
                      <div className="bo-empty-title">Aucun utilisateur</div>
                      <p>
                        {query || filter !== "all" || roleFilter
                          ? "Aucun compte ne correspond à ces filtres."
                          : "Aucun utilisateur pour le moment."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                shown.map((item) => {
                  const manageable = canManage(user?.id, item);
                  const checked = selected.includes(item.id);
                  const tone = statusTone(item);
                  return (
                    <tr key={item.id} style={checked ? { background: "var(--bo-primary-soft)" } : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!manageable}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`Sélectionner ${item.displayName || item.email}`}
                        />
                      </td>
                      <td>
                        <div className="bo-cell-main">
                          <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName || item.email} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <div className="bo-cell-title">{item.displayName || "—"}</div>
                            <div className="bo-cell-sub">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.role?.label ?? <span style={{ color: "var(--bo-muted)" }}>En attente</span>}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{item.country ? `${item.country.flagEmoji} ${item.country.name}` : "—"}</td>
                      <td>
                        <span className={`bo-pill ${PILL_TONE[tone]}`}>{statusLabel(item)}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{item.createdAt ? formatPipelineDate(item.createdAt) : "—"}</td>
                      <td>
                        <div className="bo-row-actions">
                          <button
                            type="button"
                            className="bo-btn bo-btn--sm bo-btn--icon"
                            disabled={busy}
                            title="Voir l’activité"
                            aria-label="Voir l’activité"
                            onClick={() => void openActivity(item)}
                          >
                            <History size={15} />
                          </button>
                          {manageable ? (
                            <>
                              <button
                                type="button"
                                className="bo-btn bo-btn--sm bo-btn--icon"
                                disabled={busy}
                                title={isActive(item) ? "Bloquer" : "Débloquer"}
                                aria-label={isActive(item) ? "Bloquer" : "Débloquer"}
                                onClick={() => void block([item.id], !isActive(item))}
                              >
                                {isActive(item) ? <Ban size={15} /> : <Unlock size={15} />}
                              </button>
                              <button
                                type="button"
                                className="bo-btn bo-btn--sm bo-btn--icon bo-btn--danger"
                                disabled={busy}
                                title="Supprimer"
                                aria-label="Supprimer"
                                onClick={() => askDelete([item.id])}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          ) : (
                            <span className="bo-pill is-info no-dot" title="Compte protégé">
                              <Lock size={11} />
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bo-pagination">
          <span>
            {shown.length} compte{shown.length > 1 ? "s" : ""} affiché{shown.length > 1 ? "s" : ""} sur {users.length}
          </span>
        </div>
      </div>

      {confirmDelete ? (
        <BoModal
          title={`Supprimer ${confirmDelete.ids.length > 1 ? "ces comptes" : "ce compte"} ?`}
          onClose={() => (busy ? undefined : setConfirmDelete(null))}
          footer={
            <>
              <button type="button" className="bo-btn" disabled={busy} onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button type="button" className="bo-btn bo-btn--danger-solid" disabled={busy} onClick={() => void confirmAndDelete()}>
                <Trash2 size={15} />
                Supprimer
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--bo-text-2)" }}>
            <strong>{confirmDelete.names}</strong> sera définitivement retiré de la plateforme. Cette action est irréversible.
          </p>
        </BoModal>
      ) : null}

      {activityUser ? (
        <BoModal
          title="Activité du compte"
          subtitle={activityUser.displayName || activityUser.email}
          onClose={closeActivity}
          footer={
            <button type="button" className="bo-btn" onClick={closeActivity}>
              Fermer
            </button>
          }
        >
          {activityLoading ? <div className="bo-skeleton" style={{ height: 120 }} /> : null}
          {activityError ? <p className="bo-error">{activityError}</p> : null}
          {!activityLoading && !activityError && activityEntries.length === 0 ? (
            <p style={{ margin: 0, color: "var(--bo-muted)", fontSize: 14 }}>Aucune activité enregistrée pour ce compte.</p>
          ) : null}
          {activityEntries.length > 0 ? (
            <ul className="bo-list" style={{ maxHeight: 360, overflowY: "auto", margin: "0 -24px" }}>
              {activityEntries.map((entry) => (
                <li key={entry.id} className="bo-list-item" style={{ padding: "10px 24px" }}>
                  <div className="bo-list-main">
                    <div className="bo-list-title">
                      <span>{entry.label}</span>
                    </div>
                    <div className="bo-list-sub">
                      {formatPipelineDate(entry.createdAt)}
                      {entry.actorLabel ? ` · par ${entry.actorLabel}` : ""}
                      {entry.metadata ? ` · ${entry.metadata}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </BoModal>
      ) : null}
    </section>
  );
}
