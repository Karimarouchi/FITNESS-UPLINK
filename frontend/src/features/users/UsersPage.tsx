import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Ban,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  History,
  ListFilter,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  Unlock,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isSuperAdmin, isVerified, type AuthUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { Ring, Sparkline } from "@/components/admin/dash/MiniCharts";
import { PERIODS, percentOf, registrationBuckets, signupGrowth } from "@/components/admin/dash/dashData";
import { bulkUserAction, deleteUser, fetchUserActivity, fetchUsers, setUserEnabled, type AuditLogEntry } from "./api";
import { UserActivityModal } from "./UserActivityModal";
import { UsersModal } from "./UsersModal";
import "@/shared/styles/backoffice-users.css";

type AccountFilter = "all" | "active" | "blocked";
type VerificationFilter = "" | "verified" | "pending" | "rejected";

const FILTERS: { id: AccountFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "active", label: "Actifs" },
  { id: "blocked", label: "Bloqués" },
];

const VERIFICATION_OPTIONS: { id: VerificationFilter; label: string }[] = [
  { id: "", label: "Tous les statuts" },
  { id: "verified", label: "Vérifié" },
  { id: "pending", label: "En attente" },
  { id: "rejected", label: "Refusé" },
];

const PAGE_SIZES = [
  { value: "10", label: "10 / page" },
  { value: "25", label: "25 / page" },
  { value: "50", label: "50 / page" },
];

function isActive(user: AuthUser) {
  return user.enabled !== false;
}

function canManage(actorId: string | undefined, user: AuthUser) {
  return Boolean(actorId) && user.id !== actorId && !isSuperAdmin(user);
}

function statusTone(user: AuthUser) {
  if (!isActive(user)) {
    return "danger" as const;
  }
  if (isVerified(user)) {
    return "success" as const;
  }
  if (user.verificationStatus === "rejected") {
    return "danger" as const;
  }
  return "warn" as const;
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

function verificationText(user: AuthUser) {
  if (isVerified(user)) return "Compte vérifié";
  if (user.verificationStatus === "rejected") return "Vérification refusée";
  return "Vérification en attente";
}

/** Soft colour of a role badge, by the role category the API sends. */
function roleTone(category: string | undefined) {
  switch (category) {
    case "BUSINESS":
      return "orange";
    case "FOR_YOU":
      return "blue";
    case "PROFESSIONAL":
      return "violet";
    case "SYSTEM":
      return "ink";
    default:
      return "neutral";
  }
}

function pagesToShow(current: number, count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const pages = new Set([0, count - 1, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 0 && page < count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

type KpiProps = {
  icon: ReactNode;
  tone: "orange" | "blue" | "rose";
  label: string;
  value: number;
  badge: ReactNode;
  hint: string;
  visual: ReactNode;
  loading: boolean;
};

function Kpi({ icon, tone, label, value, badge, hint, visual, loading }: KpiProps) {
  return (
    <div className="bo-dash-kpi">
      <span className={`bo-dash-icon is-${tone}`}>{icon}</span>
      <span className="bo-dash-kpi-label">{label}</span>
      {loading ? (
        <span className="bo-skeleton bo-dash-kpi-skel" />
      ) : (
        <>
          <span className="bo-dash-kpi-value">{value}</span>
          <span className="bo-dash-kpi-meta">
            {badge}
            <small>{hint}</small>
          </span>
        </>
      )}
      <span className="bo-dash-kpi-visual">{loading ? null : visual}</span>
    </div>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<AccountFilter>("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [verifFilter, setVerifFilter] = useState<VerificationFilter>("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState("10");
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
      .catch(() => setError("Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => {
      if (item.role) map.set(item.role.code, item.role.label);
    });
    return [...map.entries()].map(([code, label]) => ({ code, label })).sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [users]);

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((item) => {
      if (item.country) map.set(item.country.iso2 || item.country.name, item.country.name);
    });
    return [...map.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
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
      if (countryFilter && (item.country?.iso2 || item.country?.name || "") !== countryFilter) {
        return false;
      }
      if (verifFilter && item.verificationStatus !== verifFilter) {
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
  }, [users, query, filter, roleFilter, countryFilter, verifFilter]);

  const size = Number(pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const safePage = Math.min(page, pageCount - 1);
  const shown = useMemo(() => filtered.slice(safePage * size, safePage * size + size), [filtered, safePage, size]);

  useEffect(() => {
    setPage(0);
  }, [query, filter, roleFilter, countryFilter, verifFilter, pageSize]);

  const selectableIds = useMemo(
    () => filtered.filter((item) => canManage(user?.id, item)).map((item) => item.id),
    [filtered, user?.id],
  );
  const pageSelectable = useMemo(() => shown.filter((item) => canManage(user?.id, item)).map((item) => item.id), [shown, user?.id]);
  const selectedVisible = selected.filter((id) => selectableIds.includes(id));
  const pageSelectedCount = pageSelectable.filter((id) => selected.includes(id)).length;
  const allSelected = pageSelectable.length > 0 && pageSelectedCount === pageSelectable.length;
  const someSelected = pageSelectedCount > 0 && !allSelected;
  const hasMoreToSelect = selectableIds.length > selectedVisible.length;

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
  const verifiedCount = users.filter((item) => isVerified(item)).length;
  const growth = signupGrowth(users, "month");
  const spark = registrationBuckets(users, "30d").slice(-14).map((bucket) => bucket.count);
  const filtersActive = Boolean(query || filter !== "all" || roleFilter || countryFilter || verifFilter);

  function resetFilters() {
    setQuery("");
    setFilter("all");
    setRoleFilter("");
    setCountryFilter("");
    setVerifFilter("");
  }

  function toggleOne(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelected(allSelected ? selected.filter((id) => !pageSelectable.includes(id)) : [...new Set([...selected, ...pageSelectable])]);
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

  const growthBadge =
    growth.percent === null ? (
      <span className={growth.current > 0 ? "bo-dash-badge is-up" : "bo-dash-badge is-flat"}>
        {growth.current > 0 ? `+${growth.current}` : "0"}
      </span>
    ) : (
      <span className={growth.percent > 0 ? "bo-dash-badge is-up" : growth.percent < 0 ? "bo-dash-badge is-down" : "bo-dash-badge is-flat"}>
        {growth.percent > 0 ? "↑" : growth.percent < 0 ? "↓" : "→"} {Math.abs(growth.percent)} %
      </span>
    );

  const from = filtered.length === 0 ? 0 : safePage * size + 1;
  const to = Math.min(filtered.length, safePage * size + size);
  const roleSelectOptions = [{ value: "", label: "Tous les rôles" }, ...roleOptions.map((role) => ({ value: role.code, label: role.label }))];
  const countrySelectOptions = [{ value: "", label: "Tous les pays" }, ...countryOptions.map((country) => ({ value: country.code, label: country.name }))];

  return (
    <section className="bo-dash bo-users">
      <header className="bo-dash-head">
        <div>
          <h1>Utilisateurs</h1>
          <p>Gérez les membres, coachs et partenaires de votre plateforme.</p>
        </div>
      </header>

      <div className="bo-dash-kpis">
        <Kpi
          icon={<Users size={22} />}
          tone="orange"
          label="Comptes inscrits"
          value={users.length}
          badge={growthBadge}
          hint={PERIODS[0].vs}
          visual={<Sparkline values={spark} />}
          loading={loading}
        />
        <Kpi
          icon={<UserCheck size={22} />}
          tone="orange"
          label="Utilisateurs actifs"
          value={activeCount}
          badge={<span className="bo-dash-badge is-info">{percentOf(activeCount, users.length)} %</span>}
          hint="des comptes, non bloqués"
          visual={<Ring percent={percentOf(activeCount, users.length)} tone="orange" />}
          loading={loading}
        />
        <Kpi
          icon={<BadgeCheck size={22} />}
          tone="blue"
          label="Comptes vérifiés"
          value={verifiedCount}
          badge={<span className="bo-dash-badge is-info">{percentOf(verifiedCount, users.length)} %</span>}
          hint={`sur ${users.length} comptes`}
          visual={<Ring percent={percentOf(verifiedCount, users.length)} tone="blue" />}
          loading={loading}
        />
        <Kpi
          icon={<Lock size={22} />}
          tone="rose"
          label="Comptes bloqués"
          value={blockedCount}
          badge={<span className={blockedCount > 0 ? "bo-dash-badge is-down" : "bo-dash-badge is-flat"}>{percentOf(blockedCount, users.length)} %</span>}
          hint={blockedCount > 0 ? "à examiner" : "aucun compte bloqué"}
          visual={<Ring percent={percentOf(blockedCount, users.length)} tone="rose" />}
          loading={loading}
        />
      </div>

      {flash ? (
        <div className="bo-users-alert" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Masquer le message">
            <X size={16} />
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        <div className={selectedVisible.length > 0 ? "bo-users-toolbar is-bulk" : "bo-users-toolbar"}>
          {selectedVisible.length > 0 ? (
            <>
              <div className="bo-users-bulk-count" role="status">
                <span>{selectedVisible.length}</span>
                sélectionné{selectedVisible.length > 1 ? "s" : ""}
                {hasMoreToSelect ? (
                  <button type="button" className="bo-users-link" onClick={() => setSelected(selectableIds)}>
                    Sélectionner les {selectableIds.length} résultats
                  </button>
                ) : null}
              </div>
              <div className="bo-users-bulk-actions">
                <button type="button" className="bo-users-btn" disabled={busy} onClick={() => void block(selectedVisible, false)}>
                  <Ban size={15} />
                  Bloquer
                </button>
                <button type="button" className="bo-users-btn" disabled={busy} onClick={() => void block(selectedVisible, true)}>
                  <Unlock size={15} />
                  Débloquer
                </button>
                <button type="button" className="bo-users-btn is-danger" disabled={busy} onClick={() => askDelete(selectedVisible)}>
                  <Trash2 size={15} />
                  Supprimer
                </button>
                <button type="button" className="bo-users-btn is-ghost" onClick={() => setSelected([])}>
                  <X size={15} />
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bo-users-tabs" role="tablist" aria-label="Filtrer les utilisateurs">
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
                    <span>{item.id === "all" ? users.length : item.id === "active" ? activeCount : blockedCount}</span>
                  </button>
                ))}
              </div>
              <label className="bo-users-search">
                <Search size={16} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nom, e-mail, pays..."
                  aria-label="Rechercher un utilisateur"
                />
              </label>
              <div className="bo-users-filters">
                <DashSelect label="Rôle" value={roleFilter} options={roleSelectOptions} onChange={setRoleFilter} align="left" />
                {countryOptions.length > 0 ? (
                  <DashSelect label="Pays" value={countryFilter} options={countrySelectOptions} onChange={setCountryFilter} align="left" />
                ) : null}
                <button
                  type="button"
                  className={moreOpen || verifFilter ? "bo-users-more is-on" : "bo-users-more"}
                  aria-expanded={moreOpen}
                  aria-controls="bo-users-more-panel"
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  <ListFilter size={16} aria-hidden="true" />
                  Plus de filtres
                  {verifFilter ? <i aria-hidden="true" /> : null}
                </button>
                {filtersActive ? (
                  <button type="button" className="bo-users-reset" onClick={resetFilters} title="Réinitialiser les filtres" aria-label="Réinitialiser les filtres">
                    <RotateCcw size={16} />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {moreOpen && selectedVisible.length === 0 ? (
          <div className="bo-users-more-panel" id="bo-users-more-panel">
            <span>Statut de vérification</span>
            <div role="radiogroup" aria-label="Statut de vérification">
              {VERIFICATION_OPTIONS.map((option) => (
                <button
                  key={option.id || "all"}
                  type="button"
                  role="radio"
                  aria-checked={verifFilter === option.id}
                  className={verifFilter === option.id ? "is-on" : ""}
                  onClick={() => setVerifFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="bo-users-table-wrap">
          <table className="bo-users-table">
            <thead>
              <tr>
                <th className="is-check">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    disabled={pageSelectable.length === 0}
                    onChange={toggleAll}
                    aria-label="Sélectionner les utilisateurs de cette page"
                  />
                </th>
                <th className="is-user">Utilisateur</th>
                <th className="is-role">Rôle</th>
                <th className="is-country">Pays</th>
                <th className="is-status">Statut</th>
                <th className="is-date">Inscrit le</th>
                <th className="is-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2, 3, 4].map((key) => (
                  <tr key={key} className="is-skeleton" aria-hidden="true">
                    <td colSpan={7}>
                      <div className="bo-skeleton bo-users-skel" />
                    </td>
                  </tr>
                ))
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="bo-users-empty">
                      <span>
                        <Users size={22} aria-hidden="true" />
                      </span>
                      <strong>Aucun utilisateur</strong>
                      <p>{filtersActive ? "Aucun compte ne correspond à ces filtres." : "Aucun utilisateur pour le moment."}</p>
                      {filtersActive ? (
                        <button type="button" className="bo-users-btn" onClick={resetFilters}>
                          <RotateCcw size={15} />
                          Réinitialiser les filtres
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                shown.map((item) => {
                  const manageable = canManage(user?.id, item);
                  const checked = selected.includes(item.id);
                  const tone = statusTone(item);
                  const name = item.displayName || item.email;
                  return (
                    <tr key={item.id} className={checked ? "is-selected" : undefined}>
                      <td className="is-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!manageable}
                          onChange={() => toggleOne(item.id)}
                          aria-label={`Sélectionner ${name}`}
                        />
                      </td>
                      <td className="is-user">
                        <div className="bo-users-person">
                          <ProfileAvatar uploadId={item.avatarUploadId} name={name} size={40} />
                          <div>
                            <strong>{item.displayName || "—"}</strong>
                            <small>{item.email}</small>
                          </div>
                        </div>
                      </td>
                      <td className="is-role">
                        {item.role ? (
                          <span className={`bo-users-role is-${roleTone(item.role.category)}`}>{item.role.label}</span>
                        ) : (
                          <span className="bo-users-muted">En attente</span>
                        )}
                      </td>
                      <td className="is-country">
                        {item.country ? (
                          <div className="bo-users-country">
                            <span aria-hidden="true">{item.country.flagEmoji}</span>
                            <div>
                              <strong>{item.country.name}</strong>
                              <small>{item.country.iso2}</small>
                            </div>
                          </div>
                        ) : (
                          <span className="bo-users-muted">—</span>
                        )}
                      </td>
                      <td className="is-status">
                        <span className={`bo-users-status is-${tone}`} title={isActive(item) ? undefined : `Compte bloqué · ${verificationText(item)}`}>
                          {statusLabel(item)}
                        </span>
                      </td>
                      <td className="is-date">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="is-actions">
                        <div className="bo-users-actions">
                          <button
                            type="button"
                            className="bo-users-icon"
                            disabled={busy}
                            title="Voir l’activité"
                            aria-label={`Voir l’activité de ${name}`}
                            onClick={() => void openActivity(item)}
                          >
                            <History size={16} />
                          </button>
                          {manageable ? (
                            <>
                              <button
                                type="button"
                                className="bo-users-icon"
                                disabled={busy}
                                title={isActive(item) ? "Bloquer" : "Débloquer"}
                                aria-label={`${isActive(item) ? "Bloquer" : "Débloquer"} ${name}`}
                                onClick={() => void block([item.id], !isActive(item))}
                              >
                                {isActive(item) ? <Ban size={16} /> : <Unlock size={16} />}
                              </button>
                              <button
                                type="button"
                                className="bo-users-icon is-danger"
                                disabled={busy}
                                title="Supprimer"
                                aria-label={`Supprimer ${name}`}
                                onClick={() => askDelete([item.id])}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <span className="bo-users-protected" title="Compte protégé">
                              <Lock size={12} aria-hidden="true" />
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

        <footer className="bo-users-pager">
          <span>
            {loading
              ? "Chargement…"
              : filtered.length === 0
                ? `0 utilisateur sur ${users.length}`
                : `${from}-${to} sur ${filtered.length} utilisateur${filtered.length > 1 ? "s" : ""}${filtered.length !== users.length ? ` (${users.length} au total)` : ""}`}
          </span>
          <nav className="bo-users-pages" aria-label="Pagination">
            <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Page précédente">
              <ChevronLeft size={16} />
            </button>
            {pagesToShow(safePage, pageCount).map((entry, index) =>
              entry === "gap" ? (
                <span key={`gap-${index}`} className="bo-users-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  className={entry === safePage ? "is-current" : ""}
                  aria-current={entry === safePage ? "page" : undefined}
                  aria-label={`Page ${entry + 1}`}
                  onClick={() => setPage(entry)}
                >
                  {entry + 1}
                </button>
              ),
            )}
            <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} aria-label="Page suivante">
              <ChevronRight size={16} />
            </button>
          </nav>
          <DashSelect label="Lignes par page" value={pageSize} options={PAGE_SIZES} onChange={setPageSize} placement="up" />
        </footer>
      </div>

      {confirmDelete ? (
        <UsersModal
          size="sm"
          title={`Supprimer ${confirmDelete.ids.length > 1 ? "ces comptes" : "ce compte"} ?`}
          onClose={() => setConfirmDelete(null)}
          locked={busy}
          footer={
            <>
              <button type="button" className="um-btn" disabled={busy} onClick={() => setConfirmDelete(null)} data-autofocus>
                Annuler
              </button>
              <button type="button" className="um-btn is-danger" disabled={busy} onClick={() => void confirmAndDelete()}>
                <Trash2 size={15} />
                {busy ? "Suppression…" : "Supprimer"}
              </button>
            </>
          }
        >
          <div className="um-warning">
            <span aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <p>
              <strong>{confirmDelete.names}</strong> sera définitivement retiré de la plateforme. Cette action est irréversible.
            </p>
          </div>
        </UsersModal>
      ) : null}

      {activityUser ? (
        <UserActivityModal user={activityUser} entries={activityEntries} loading={activityLoading} error={activityError} onClose={closeActivity} />
      ) : null}
    </section>
  );
}
