import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { RoleCard } from "@/features/auth/types";
import { fetchRoles, selectRole } from "../api";

type RoleGroup = {
  category: string;
  label: string;
  roles: RoleCard[];
};

export function ChooseRolePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(user?.role?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRoles()
      .then((items) => {
        if (!cancelled) {
          setRoles(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load roles.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<RoleGroup[]>(() => {
    const order: RoleGroup[] = [];
    const index = new Map<string, RoleGroup>();
    for (const role of roles) {
      let group = index.get(role.category);
      if (!group) {
        group = { category: role.category, label: role.categoryLabel, roles: [] };
        index.set(role.category, group);
        order.push(group);
      }
      group.roles.push(role);
    }
    return order;
  }, [roles]);

  async function onContinue() {
    if (!selectedId) {
      setError("Choose the profile that best represents you.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const next = await selectRole(selectedId);
      updateUser(next);
      navigate("/onboarding/country", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your role");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ob-shell ob-shell--wide">
      <header className="ob-top">
        <span className="ob-back-spacer" />
        <div className="ob-step-meta">
          <span className="font-mono-data">Step 1 of 3</span>
          <div className="ob-dots">
            <span className="ob-dot is-active" />
            <span className="ob-dot" />
            <span className="ob-dot" />
          </div>
        </div>
      </header>
      <main className="ob-main ob-main--wide">
        <div className="ob-heading">
          <h1 className="font-display-lg-mobile md:font-display-lg text-primary">How will you use Fitness Uplink?</h1>
          <p className="font-body-lg text-on-surface-variant">
            Choose the profile that best represents you. You can complete your information later.
          </p>
        </div>
        {loading ? <p className="font-body-md text-on-surface-variant">Loading roles…</p> : null}
        <div className="ob-role-sections">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="font-label-caps uppercase tracking-wider text-on-surface-variant mb-4">{group.label}</h2>
              <div className="ob-role-grid">
                {group.roles.map((role) => {
                  const active = selectedId === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={`profile-card${active ? " active" : ""}`}
                      onClick={() => {
                        setSelectedId(role.id);
                        setError(null);
                      }}
                    >
                      <span className="material-symbols-outlined check-icon">check_circle</span>
                      <span
                        className="material-symbols-outlined profile-card-icon"
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        {role.icon}
                      </span>
                      <h3>{role.label}</h3>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {error ? <p className="auth-error mt-6">{error}</p> : null}
        <div className="ob-footer-end">
          <button className="ob-primary-pill" type="button" onClick={() => void onContinue()} disabled={submitting || !selectedId}>
            <span>{submitting ? "Saving..." : "Continue"}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}
