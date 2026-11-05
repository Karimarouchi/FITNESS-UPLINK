import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Dumbbell,
  GraduationCap,
  IdCard,
  Loader2,
  Lock,
  PenLine,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  TriangleAlert,
  UserCog,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { UsersModal } from "@/features/users/UsersModal";
import {
  fetchAdminPermissions,
  fetchAdminRoles,
  saveRolePermissions,
  type AdminPermission,
  type AdminRoleAccess,
} from "../rolesApi";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-roles.css";

type IconType = ComponentType<{ size?: number }>;

const MODULE_ICONS: Record<string, IconType> = {
  account: UserCog,
  hire: Briefcase,
  coaching: Dumbbell,
  marketplace: Store,
  services: Wrench,
  academy: GraduationCap,
  events: CalendarDays,
  content: PenLine,
  admin: ShieldCheck,
};

const MODULE_TONES: Record<string, string> = {
  account: "is-blue",
  hire: "is-orange",
  coaching: "is-green",
  marketplace: "is-orange",
  services: "is-blue",
  academy: "is-violet",
  events: "is-rose",
  content: "is-violet",
  admin: "is-rose",
};

const ROLE_ICONS: Record<string, { icon: IconType; tone: string }> = {
  MEMBER: { icon: UserRound, tone: "is-blue" },
  COACH: { icon: UserRound, tone: "is-green" },
  CANDIDATE: { icon: IdCard, tone: "is-blue" },
  EMPLOYER: { icon: Briefcase, tone: "is-orange" },
  GYM: { icon: Dumbbell, tone: "is-green" },
  ACADEMY: { icon: GraduationCap, tone: "is-violet" },
  SUPPLIER: { icon: Truck, tone: "is-orange" },
  SERVICE_PROVIDER: { icon: Wrench, tone: "is-blue" },
  EVENT_ORGANIZER: { icon: CalendarCheck, tone: "is-rose" },
  EXPERT_CREATOR: { icon: Clapperboard, tone: "is-violet" },
  SUPER_ADMIN: { icon: Lock, tone: "is-ink" },
};

export function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRoleAccess[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [pendingRole, setPendingRole] = useState<AdminRoleAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminRoles(), fetchAdminPermissions()])
      .then(([nextRoles, nextPermissions]) => {
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        const first = nextRoles.find((item) => !item.locked) ?? nextRoles[0];
        if (first) {
          setSelectedId(first.id);
          setDraft(first.permissionCodes);
        }
        setError(null);
      })
      .catch(() => setError("Impossible de charger les rôles et permissions."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const selected = roles.find((item) => item.id === selectedId) ?? null;
  const savedCodes = selected?.permissionCodes ?? [];
  const dirty = Boolean(selected) && !selected!.locked && !sameCodes(draft, savedCodes);

  // closing or reloading the tab with unsaved changes (in-app navigation uses a non-data router, so it cannot be intercepted)
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const modules = useMemo(() => {
    const grouped = new Map<string, { label: string; items: AdminPermission[] }>();
    for (const permission of permissions) {
      const current = grouped.get(permission.module) ?? { label: permission.moduleLabel, items: [] };
      current.items.push(permission);
      grouped.set(permission.module, current);
    }
    return [...grouped.entries()];
  }, [permissions]);

  const adminCodes = useMemo(() => permissions.filter((item) => item.module === "admin").map((item) => item.code), [permissions]);
  const adminSelected = draft.filter((code) => adminCodes.includes(code)).length;

  function applyRole(role: AdminRoleAccess) {
    setSelectedId(role.id);
    setDraft(role.permissionCodes);
    setOpen({});
    setFlash(null);
    setError(null);
  }

  function selectRole(role: AdminRoleAccess) {
    if (role.id === selectedId) return;
    if (dirty) {
      setPendingRole(role);
      return;
    }
    applyRole(role);
  }

  function toggleGroup(module: string) {
    setOpen((current) => ({ ...current, [module]: !current[module] }));
  }

  function toggle(code: string) {
    if (selected?.locked) {
      return;
    }
    setDraft((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  }

  function setGroup(items: AdminPermission[], enabled: boolean) {
    if (selected?.locked) {
      return;
    }
    const codes = items.map((item) => item.code);
    setDraft((current) => {
      const without = current.filter((code) => !codes.includes(code));
      return enabled ? [...without, ...codes] : without;
    });
  }

  async function save() {
    if (!selected || selected.locked || busy || !dirty) {
      return;
    }
    setBusy(true);
    try {
      const updated = await saveRolePermissions(selected.id, draft);
      setRoles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDraft(updated.permissionCodes);
      setFlash(`Permissions enregistrées pour ${updated.label}.`);
      setError(null);
    } catch {
      setError("Impossible d’enregistrer ces permissions.");
    } finally {
      setBusy(false);
    }
  }

  const total = permissions.length;
  const activeCount = selected ? (selected.locked ? total : draft.length) : 0;

  return (
    <section className="bo-dash bo-users bo-rx">
      <header className="bo-dash-head">
        <div>
          <h1>Rôles et permissions</h1>
          <p>Configurez les droits de chaque rôle de l’application.</p>
        </div>
        {selected && !selected.locked ? (
          <button type="button" className="rx-save" disabled={busy || !dirty} onClick={() => void save()}>
            {busy ? <Loader2 size={16} className="rx-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {busy ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        ) : null}
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
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rx-layout">
        <aside className="bo-dash-card rx-roles" aria-label="Rôles">
          <div className="rx-card-head">
            <h2>Rôles</h2>
            <span>{roles.length}</span>
          </div>
          <ul className="rx-role-list">
            {loading
              ? [0, 1, 2, 3, 4, 5].map((key) => (
                  <li key={key} aria-hidden="true">
                    <div className="bo-skeleton rx-skel" />
                  </li>
                ))
              : roles.map((role) => {
                  const meta = ROLE_ICONS[role.code] ?? { icon: UserRound, tone: "is-blue" };
                  const RoleIcon = meta.icon;
                  const isActive = role.id === selectedId;
                  const count = role.locked ? permissions.length : isActive ? draft.length : role.permissionCodes.length;
                  return (
                    <li key={role.id}>
                      <button
                        type="button"
                        className={`rx-role${isActive ? " is-active" : ""}`}
                        aria-pressed={isActive}
                        onClick={() => selectRole(role)}
                      >
                        <span className={`rx-tile ${meta.tone}`}>
                          <RoleIcon size={18} />
                        </span>
                        <span className="rx-role-copy">
                          <strong>{role.label}</strong>
                          <small>
                            {role.locked ? "Tous les droits" : `${count} droit${count > 1 ? "s" : ""}`}
                          </small>
                        </span>
                        {role.locked ? (
                          <span className="rx-badge is-lock">
                            <Lock size={11} aria-hidden="true" />
                            Protégé
                          </span>
                        ) : !role.selectable ? (
                          <span className="rx-badge" title="Ce rôle n’est pas proposé à l’inscription, mais ses droits restent configurables.">
                            Hors inscription
                          </span>
                        ) : null}
                        <ChevronRight size={16} className="rx-role-chevron" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
          </ul>
        </aside>

        <div className="bo-dash-card rx-perms">
          {!selected ? (
            <div className="bo-users-empty">
              <span>
                <ShieldCheck size={22} aria-hidden="true" />
              </span>
              <strong>Aucun rôle sélectionné</strong>
              <p>Choisissez un rôle pour consulter ses droits.</p>
            </div>
          ) : (
            <>
              <div className="rx-perms-head">
                <div>
                  <h2>Droits · {selected.label}</h2>
                  {selected.description ? <p>{selected.description}</p> : null}
                </div>
                <div className="rx-perms-meta">
                  <span className="rx-count">
                    <strong>{activeCount}</strong> / {total} permissions activées
                  </span>
                  {dirty ? (
                    <span className="rx-dirty">
                      <i aria-hidden="true" />
                      Modifications non enregistrées
                    </span>
                  ) : null}
                </div>
              </div>

              {selected.locked ? (
                <div className="rx-locked">
                  <span aria-hidden="true">
                    <Lock size={22} />
                  </span>
                  <div>
                    <strong>Rôle protégé</strong>
                    <p>Le super admin a toujours tous les droits. Ils ne peuvent pas être réduits.</p>
                  </div>
                </div>
              ) : (
                <>
                  {adminSelected > 0 ? (
                    <p className="rx-warning" role="note">
                      <TriangleAlert size={16} aria-hidden="true" />
                      <span>
                        {adminSelected} droit{adminSelected > 1 ? "s" : ""} d’administration sélectionné{adminSelected > 1 ? "s" : ""} : ils donnent accès à des pages
                        d’administration sensibles.
                      </span>
                    </p>
                  ) : null}
                  <div className="rx-groups">
                    {modules.map(([module, group]) => (
                      <Group
                        key={module}
                        module={module}
                        label={group.label}
                        items={group.items}
                        draft={draft}
                        open={Boolean(open[module])}
                        onToggleOpen={() => toggleGroup(module)}
                        onToggle={toggle}
                        onSetGroup={(enabled) => setGroup(group.items, enabled)}
                      />
                    ))}
                  </div>
                  <footer className="rx-foot">
                    <span className={dirty ? "rx-dirty" : "rx-clean"}>
                      <i aria-hidden="true" />
                      {dirty ? "Modifications non enregistrées" : "Aucune modification"}
                    </span>
                    <button type="button" className="rx-save" disabled={busy || !dirty} onClick={() => void save()}>
                      {busy ? <Loader2 size={16} className="rx-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                      {busy ? "Enregistrement…" : "Enregistrer les modifications"}
                    </button>
                  </footer>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {pendingRole ? (
        <UsersModal
          title="Modifications non enregistrées"
          onClose={() => setPendingRole(null)}
          footer={
            <>
              <button type="button" className="um-btn" data-autofocus onClick={() => setPendingRole(null)}>
                Continuer la modification
              </button>
              <button
                type="button"
                className="um-btn is-danger"
                onClick={() => {
                  applyRole(pendingRole);
                  setPendingRole(null);
                }}
              >
                Abandonner les modifications
              </button>
            </>
          }
        >
          <div className="um-warning">
            <span aria-hidden="true">
              <TriangleAlert size={20} />
            </span>
            <p>
              Vous avez modifié les permissions de <strong>{selected?.label}</strong> sans les enregistrer. Voulez-vous abandonner ces modifications ?
            </p>
          </div>
        </UsersModal>
      ) : null}
    </section>
  );
}

function Group({
  module,
  label,
  items,
  draft,
  open,
  onToggleOpen,
  onToggle,
  onSetGroup,
}: {
  module: string;
  label: string;
  items: AdminPermission[];
  draft: string[];
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (code: string) => void;
  onSetGroup: (enabled: boolean) => void;
}) {
  const master = useRef<HTMLInputElement>(null);
  const Icon = MODULE_ICONS[module] ?? SlidersHorizontal;
  const active = items.filter((item) => draft.includes(item.code)).length;
  const allOn = active === items.length;
  const state = active === 0 ? "none" : allOn ? "all" : "some";
  const bodyId = `rx-group-${module}`;

  useEffect(() => {
    if (master.current) master.current.indeterminate = state === "some";
  }, [state, open]);

  return (
    <section className={`rx-group${open ? " is-open" : ""}`}>
      <button type="button" className="rx-group-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggleOpen}>
        <span className={`rx-tile ${MODULE_TONES[module] ?? "is-blue"}`}>
          <Icon size={18} />
        </span>
        <span className="rx-group-copy">
          <strong>{label}</strong>
          <small>
            {active} / {items.length} activé{active > 1 ? "s" : ""}
          </small>
        </span>
        <span className={`rx-progress is-${state}`}>
          {active}/{items.length}
        </span>
        <ChevronDown size={18} className="rx-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="rx-group-body" id={bodyId}>
          <label className="rx-master">
            <input ref={master} type="checkbox" checked={allOn} onChange={() => onSetGroup(!allOn)} />
            <span>{allOn ? "Tout retirer" : "Tout activer"}</span>
          </label>
          {items.map((permission) => {
            const checked = draft.includes(permission.code);
            return (
              <label key={permission.code} className={`rx-check${checked ? " is-on" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(permission.code)} />
                <span>
                  <strong>
                    {permission.label}
                    {permission.module === "admin" ? <em className="rx-admin">Admin</em> : null}
                  </strong>
                  {permission.description ? <small>{permission.description}</small> : null}
                </span>
                {checked ? <Check size={15} className="rx-check-mark" aria-hidden="true" /> : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function sameCodes(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  const other = new Set(right);
  return left.every((code) => other.has(code));
}
