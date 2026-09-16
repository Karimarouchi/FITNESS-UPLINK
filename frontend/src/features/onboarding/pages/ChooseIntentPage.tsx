import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { selectIntent } from "../api";
import { OnboardingFrame } from "../OnboardingFrame";
import { useOnboardingLocale } from "../LocaleContext";

const OPTIONS = [
  { id: "JOB" as const, titleKey: "intentJob" as const, helpKey: "intentJobHelp" as const, icon: "work" },
  { id: "COACHING" as const, titleKey: "intentCoach" as const, helpKey: "intentCoachHelp" as const, icon: "sports" },
  { id: "BOTH" as const, titleKey: "intentBoth" as const, helpKey: "intentBothHelp" as const, icon: "hub" },
];

export function ChooseIntentPage() {
  const { user, updateUser } = useAuth();
  const { t } = useOnboardingLocale();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(user?.professionalIntent ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onContinue() {
    if (!selected) {
      setError(t.intentError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const next = await selectIntent(selected);
      updateUser(next);
      navigate("/onboarding/country", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.roleSaveError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingFrame
      step={t.stepIntent}
      back={{ label: t.back, onClick: () => navigate("/onboarding/role") }}
    >
      <main className="ob-main ob-main--wide">
        <div className="ob-heading">
          <p className="ob-kicker">{t.intentKicker}</p>
          <h1>{t.intentTitle}</h1>
          <p>{t.intentSubtitle}</p>
        </div>
        <div className="ob-intent-grid">
          {OPTIONS.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`profile-card${active ? " active" : ""}`}
                onClick={() => {
                  setSelected(option.id);
                  setError(null);
                }}
              >
                <span className="material-symbols-outlined check-icon">check_circle</span>
                <span className="material-symbols-outlined profile-card-icon" style={{ fontVariationSettings: "'wght' 200" }}>
                  {option.icon}
                </span>
                <h3>{t[option.titleKey]}</h3>
                <span className="ob-role-desc">{t[option.helpKey]}</span>
              </button>
            );
          })}
        </div>
        {error ? <p className="auth-error mt-6">{error}</p> : null}
        <div className="ob-footer-end">
          <button className="ob-primary-pill" type="button" onClick={() => void onContinue()} disabled={submitting || !selected}>
            <span>{submitting ? t.saving : t.continue}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </OnboardingFrame>
  );
}
