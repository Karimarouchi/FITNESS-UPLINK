import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import {
  hasPermission,
  initialsOf,
  isSuperAdmin,
  isVerified,
  type AuthUser,
} from "@/features/auth/types";
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((item) => {
      if (filter === "active" && !isActive(item)) {
        return false;
      }
      if (filter === "blocked" && isActive(item)) {
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
  }, [users, query, filter]);

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

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <div className="sub">
            {users.length} compte{users.length > 1 ? "s" : ""} inscrit{users.length > 1 ? "s" : ""} · {activeCount} actif
            {activeCount > 1 ? "s" : ""} · {blockedCount} bloqué{blockedCount > 1 ? "s" : ""}
          </div>
        </div>
        <form className="search" onSubmit={(event) => event.preventDefault()} role="search">
          🔍
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un nom, un e-mail, un rôle…"
          />
        </form>
      </div>

      <div className="filter-pills" role="tablist" aria-label="Filtrer les utilisateurs">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`filter-pill${filter === item.id ? " is-active" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="users-filter-count">
              {item.id === "all" ? users.length : item.id === "active" ? activeCount : blockedCount}
            </span>
          </button>
        ))}
      </div>

      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <Panel>
        {selectedVisible.length > 0 ? (
          <div className="users-toolbar">
            <label className="users-check-label">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Tout sélectionner
            </label>
            <span className="users-toolbar-count">
              {selectedVisible.length} sélectionné{selectedVisible.length > 1 ? "s" : ""}
            </span>
            <div className="users-toolbar-actions">
              <Button variant="mini" disabled={busy} onClick={() => void block(selectedVisible, false)}>
                Bloquer
              </Button>
              <Button variant="mini" disabled={busy} onClick={() => void block(selectedVisible, true)}>
                Débloquer
              </Button>
              <Button variant="danger" disabled={busy} onClick={() => askDelete(selectedVisible)}>
                Supprimer
              </Button>
            </div>
          </div>
        ) : null}

        {!error && filtered.length === 0 ? (
          <p className="empty-hint">
            {query || filter !== "all"
              ? "Aucun utilisateur ne correspond à ce filtre."
              : "Aucun utilisateur pour le moment."}
          </p>
        ) : null}

        {filtered.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th className="users-check-col">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Pays</th>
                <th>Statut</th>
                <th>Inscrit le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const manageable = canManage(user?.id, item);
                const checked = selected.includes(item.id);
                return (
                  <tr key={item.id} className={checked ? "is-selected" : undefined}>
                    <td className="users-check-col">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!manageable}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Sélectionner ${item.displayName || item.email}`}
                      />
                    </td>
                    <td>
                      <div className="user-cell">
                        <span className="sb-avatar sm">{initialsOf(item.displayName || item.email)}</span>
                        <span>{item.displayName || "—"}</span>
                      </div>
                    </td>
                    <td>{item.email}</td>
                    <td>{item.role?.label ?? "En attente"}</td>
                    <td>{item.country ? `${item.country.flagEmoji} ${item.country.name}` : "—"}</td>
                    <td>
                      <StatusPill tone={statusTone(item)}>{statusLabel(item)}</StatusPill>
                    </td>
                    <td>{item.createdAt ? formatPipelineDate(item.createdAt) : "—"}</td>
                    <td>
                      <div className="users-row-actions">
                        <Button variant="mini" disabled={busy} onClick={() => void openActivity(item)}>
                          Voir activité
                        </Button>
                        {manageable ? (
                          <>
                            <Button
                              variant="mini"
                              disabled={busy}
                              onClick={() => void block([item.id], !isActive(item))}
                            >
                              {isActive(item) ? "Bloquer" : "Débloquer"}
                            </Button>
                            <Button variant="danger" disabled={busy} onClick={() => askDelete([item.id])}>
                              Supprimer
                            </Button>
                          </>
                        ) : (
                          <span className="users-locked">Compte admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </Panel>

      {confirmDelete ? (
        <div className="fu-backdrop" role="presentation" onClick={() => (busy ? null : setConfirmDelete(null))}>
          <div className="fu-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Supprimer {confirmDelete.ids.length > 1 ? "ces comptes" : "ce compte"} ?</h2>
            <p>
              {confirmDelete.names} sera définitivement retiré de la plateforme. Cette action est irréversible.
            </p>
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" disabled={busy} onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <Button variant="danger" disabled={busy} onClick={() => void confirmAndDelete()}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activityUser ? (
        <div className="fu-backdrop" role="presentation" onClick={closeActivity}>
          <div className="fu-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>Activité — {activityUser.displayName || activityUser.email}</h2>
            {activityLoading ? <p className="empty-hint">Chargement…</p> : null}
            {activityError ? <p className="auth-error">{activityError}</p> : null}
            {!activityLoading && !activityError && activityEntries.length === 0 ? (
              <p className="empty-hint">Aucune activité enregistrée pour ce compte.</p>
            ) : null}
            {activityEntries.length > 0 ? (
              <ul className="hire-file-list">
                {activityEntries.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.label}</strong>
                      <span> · {formatPipelineDate(entry.createdAt)}</span>
                      {entry.actorLabel ? <span> · par {entry.actorLabel}</span> : null}
                    </div>
                    {entry.metadata ? <div className="sub">{entry.metadata}</div> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" onClick={closeActivity}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
