import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { CountrySummary } from "@/features/auth/types";
import { fetchCountries, selectCountry } from "../api";
import { OnboardingBrand } from "../OnboardingFrame";
import { LocaleSwitch, useOnboardingLocale } from "../LocaleContext";

export function ChooseCountryPage() {
  const { user, updateUser } = useAuth();
  const { t } = useOnboardingLocale();
  const navigate = useNavigate();
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(user?.country?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const longFlow = user?.role?.code === "CANDIDATE";
  const memberFlow = user?.role?.code === "MEMBER";

  useEffect(() => {
    let cancelled = false;
    fetchCountries()
      .then((items) => {
        if (!cancelled) {
          setCountries(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t.countryError);
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
  }, [t.countryError]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return countries;
    }
    return countries.filter(
      (country) => country.name.toLowerCase().includes(q) || country.iso2.toLowerCase().includes(q),
    );
  }, [countries, query]);

  async function onContinue() {
    if (!selectedId) {
      setError(t.countryError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const next = await selectCountry(selectedId);
      updateUser(next);
      navigate("/onboarding/profile", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.roleSaveError);
    } finally {
      setSubmitting(false);
    }
  }

  const backTo = longFlow ? "/onboarding/intent" : "/onboarding/role";

  return (
    <div className="fu-public ob-shell ob-shell--narrow">
      <main className="ob-country">
        <header className="ob-country-header">
          <div className="ob-country-brand">
            <OnboardingBrand />
            <span className="ob-step-label">{memberFlow ? t.stepCountryMember : longFlow ? t.stepCountryLong : t.stepCountry}</span>
          </div>
          <LocaleSwitch />
        </header>
        <div className="ob-heading">
          <h1>{t.countryTitle}</h1>
          <p>{t.countrySubtitle}</p>
        </div>
        <div className="ob-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            placeholder={t.countrySearch}
            value={query}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="country-list custom-scrollbar">
          {loading ? <p className="country-empty">{t.countryLoading}</p> : null}
          {!loading && filtered.length === 0 ? <p className="country-empty">{t.countryEmpty}</p> : null}
          {filtered.map((country) => {
            const active = selectedId === country.id;
            return (
              <button
                key={country.id}
                type="button"
                className={`country-row${active ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedId(country.id);
                  setError(null);
                }}
              >
                <span className="country-row-main">
                  <span className="country-flag" role="img" aria-label={country.name}>
                    {country.flagEmoji}
                  </span>
                  <span className="country-name">{country.name}</span>
                </span>
                {active ? <span className="material-symbols-outlined country-check">check_circle</span> : null}
              </button>
            );
          })}
        </div>
        {error ? <p className="auth-error mt-4">{error}</p> : null}
        <div className="ob-country-actions">
          <button className="ob-ghost" type="button" onClick={() => navigate(backTo)}>
            {t.back}
          </button>
          <button className="ob-primary" type="button" onClick={() => void onContinue()} disabled={submitting || !selectedId}>
            {submitting ? t.saving : t.continue}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}
