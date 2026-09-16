import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import {
  fetchAdminPermissions,
  fetchAdminRoles,
  saveRolePermissions,
  type AdminPermission,
  type AdminRoleAccess,
} from "../rolesApi";

const MODULE_ICONS: Record<string, string> = {
  account: "manage_accounts",
  hire: "work",
  coaching: "sports",
  marketplace: "storefront",
  services: "handyman",
  academy: "school",
  events: "event",
  content: "edit_note",
  admin: "admin_panel_settings",
};

export function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRoleAccess[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [openModule, setOpenModule] = useState<string | null>(null);
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
      .catch(() => setError("Impossible de charger les rôles et permissions."));
  }, []);

  const selected = roles.find((item) => item.id === selectedId) ?? null;
  const savedCodes = selected?.permissionCodes ?? [];
  const dirty = Boolean(selected) && !selected.locked && !sameCodes(draft, savedCodes);

  const modules = useMemo(() => {
    const grouped = new Map<string, { label: string; items: AdminPermission[] }>();
    for (const permission of permissions) {
      const current = grouped.get(permission.module) ?? { label: permission.moduleLabel, items: [] };
      current.items.push(permission);
      grouped.set(permission.module, current);
    }
    return [...grouped.entries()];
  }, [permissions]);

  function selectRole(role: AdminRoleAccess) {
    setSelectedId(role.id);
    setDraft(role.permissionCodes);
    setOpenModule(null);
    setFlash(null);
  }

  function toggleGroup(module: string) {
    setOpenModule((current) => (current === module ? null : module));
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

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Rôles et permissions</h1>
          <p className="sub">Choisissez un rôle, ouvrez un domaine, puis cochez uniquement ce dont il a besoin.</p>
        </div>
        {selected && !selected.locked ? (
          <Button variant="primary" disabled={busy || !dirty} onClick={() => void save()}>
            Enregistrer
          </Button>
        ) : null}
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      <div className="roles-layout">
        <Panel title="Rôles">
          <div className="roles-list">
            {roles.map((role) => {
              const count = role.locked ? permissions.length : role.permissionCodes.length;
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`roles-item${role.id === selectedId ? " is-active" : ""}`}
                  onClick={() => selectRole(role)}
                >
                  <strong>{role.label}</strong>
                  <span>
                    {role.locked ? "Tous les droits" : `${count} droit${count > 1 ? "s" : ""}`}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title={selected ? `Droits · ${selected.label}` : "Permissions"}>
          {!selected ? <p className="empty-hint">Choisissez un rôle à gauche.</p> : null}
          {selected?.locked ? (
            <p className="empty-hint">Le super admin a toujours tous les droits. Ils ne peuvent pas être réduits.</p>
          ) : null}
          {selected && !selected.locked
            ? modules.map(([module, group]) => {
                const open = openModule === module;
                const active = group.items.filter((item) => draft.includes(item.code)).length;
                const allOn = active === group.items.length;
                return (
                  <div key={module} className={`roles-acc${open ? " is-open" : ""}`}>
                    <button
                      type="button"
                      className="roles-acc-head"
                      aria-expanded={open}
                      onClick={() => toggleGroup(module)}
                    >
                      <span className="material-symbols-outlined roles-acc-icon">
                        {MODULE_ICONS[module] ?? "tune"}
                      </span>
                      <span className="roles-acc-copy">
                        <strong>{group.label}</strong>
                        <em>
                          {active} / {group.items.length} activé{active > 1 ? "s" : ""}
                        </em>
                      </span>
                      <span className="material-symbols-outlined roles-acc-chevron">expand_more</span>
                    </button>
                    {open ? (
                      <div className="roles-acc-body">
                        <div className="roles-acc-tools">
                          <button type="button" className="roles-acc-link" onClick={() => setGroup(group.items, !allOn)}>
                            {allOn ? "Tout retirer" : "Tout activer"}
                          </button>
                        </div>
                        {group.items.map((permission) => (
                          <label key={permission.code} className="roles-check">
                            <input
                              type="checkbox"
                              checked={draft.includes(permission.code)}
                              onChange={() => toggle(permission.code)}
                            />
                            <span>
                              <strong>{permission.label}</strong>
                              <em>{permission.description}</em>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : null}
        </Panel>
      </div>
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
