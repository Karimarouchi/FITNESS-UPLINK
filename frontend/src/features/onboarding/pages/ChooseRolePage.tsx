import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { RoleCard } from "@/features/auth/types";
import { fetchRoles, selectRole } from "../api";
import { OnboardingFrame } from "../OnboardingFrame";
import { useOnboardingLocale } from "../LocaleContext";
import { roleI18n } from "../i18n";

type RoleGroup = {
  category: string;
  label: string;
  roles: RoleCard[];
};

type Audience = "individual" | "employer";

function isEmployerRole(role: Pick<RoleCard, "category">) {
  return role.category === "BUSINESS";
}

export function ChooseRolePage() {
  const { user, updateUser } = useAuth();
  const { locale, t } = useOnboardingLocale();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<RoleCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(user?.role?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [audience, setAudience] = useState<Audience>(user?.role?.category === "BUSINESS" ? "employer" : "individual");
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

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
          setError(t.roleLoadError);
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
  }, [t.roleLoadError]);

  const groups = useMemo<RoleGroup[]>(() => {
    const order: RoleGroup[] = [];
    const index = new Map<string, RoleGroup>();
    for (const role of roles) {
      const i18n = roleI18n(role.code, locale, role);
      let group = index.get(role.category);
      if (!group) {
        group = { category: role.category, label: i18n.category, roles: [] };
        index.set(role.category, group);
        order.push(group);
      }
      group.roles.push(role);
    }
    return order;
  }, [roles, locale]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          roles: group.roles.filter((role) =>
            audience === "employer" ? isEmployerRole(role) : !isEmployerRole(role),
          ),
        }))
        .filter((group) => group.roles.length > 0),
    [groups, audience],
  );

  const visibleRoles = useMemo(
    () => visibleGroups.flatMap((group) => group.roles),
    [visibleGroups],
  );

  function switchAudience(next: Audience) {
    if (next === audience) return;
    setAnimDir(next === "employer" ? "right" : "left");
    setAudience(next);
    setError(null);
  }

  async function onContinue() {
    if (!selectedId) {
      setError(t.roleError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const next = await selectRole(selectedId);
      updateUser(next);
      if (next.role?.code === "CANDIDATE") {
        navigate("/onboarding/intent", { replace: true });
      } else {
        navigate("/onboarding/country", { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.roleSaveError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingFrame step={t.stepRole}>
      <main className="ob-main ob-main--wide">
        <div className="ob-heading">
          <h1>{t.roleTitle}</h1>
          <p>{t.roleSubtitle}</p>
          <p>{t.roleHint}</p>
        </div>
        {loading ? <p className="font-body-md text-on-surface-variant">{t.loadingRoles}</p> : null}
        <div className="ob-audience">
          <div className="ob-audience-tabs" role="tablist" aria-label="Type de compte">
            <button
              type="button"
              role="tab"
              aria-selected={audience === "individual"}
              className={`ob-audience-tab${audience === "individual" ? " is-active" : ""}`}
              onClick={() => switchAudience("individual")}
            >
              {t.audienceIndividual}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={audience === "employer"}
              className={`ob-audience-tab${audience === "employer" ? " is-active" : ""}`}
              onClick={() => switchAudience("employer")}
            >
              {t.audienceEmployer}
            </button>
            <div className={`ob-audience-indicator${audience === "employer" ? " is-right" : ""}`} />
          </div>
          <p className="ob-audience-hint">
            {audience === "employer" ? t.audienceEmployerHint : t.audienceIndividualHint}
          </p>
        </div>
        <div className="ob-role-viewport">
          <div key={audience} className={`ob-role-sections ob-role-sections--${animDir}`}>
            <div className={`ob-role-grid ${audience === "employer" ? "ob-role-grid--employer" : "ob-role-grid--pair"}`}>
              {visibleRoles.map((role) => {
                const active = selectedId === role.id;
                const i18n = roleI18n(role.code, locale, role);
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
                    <h3>{i18n.label}</h3>
                    {i18n.description ? <span className="ob-role-desc">{i18n.description}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {error ? <p className="auth-error mt-6">{error}</p> : null}
        <div className="ob-footer-end">
          <button className="ob-primary-pill" type="button" onClick={() => void onContinue()} disabled={submitting || !selectedId}>
            <span>{submitting ? t.saving : t.continue}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </OnboardingFrame>
  );
}
