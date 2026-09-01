import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { CountrySummary } from "@/features/auth/types";
import { fetchCountries, selectCountry } from "../api";

export function ChooseCountryPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(user?.country?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
          setError("Unable to load countries.");
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
      setError("Select the country you are based in.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const next = await selectCountry(selectedId);
      updateUser(next);
      navigate("/onboarding/profile", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your country");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ob-shell ob-shell--narrow">
      <main className="ob-country">
        <header className="ob-country-header">
          <div className="ob-country-brand">
            <span className="font-headline-md text-primary">FITNESS UPLINK</span>
            <span className="font-mono-data text-on-surface-variant">
              STEP 2 <span className="text-outline">/</span> 3
            </span>
          </div>
          <div className="ob-bars">
            <span className="ob-bar is-done" />
            <span className="ob-bar is-active" />
            <span className="ob-bar" />
          </div>
        </header>
        <div className="ob-heading">
          <h1 className="font-display-lg-mobile md:font-display-lg text-primary">Where are you based?</h1>
          <p className="font-body-lg text-on-surface-variant">
            Fitness Uplink personalizes opportunities, content and services by country.
          </p>
        </div>
        <div className="ob-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="search"
            placeholder="Search countries..."
            value={query}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="country-list custom-scrollbar">
          {loading ? <p className="country-empty">Loading countries…</p> : null}
          {!loading && filtered.length === 0 ? <p className="country-empty">No country matches your search.</p> : null}
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
                  <span className="country-flag" role="img" aria-label={`Flag of ${country.name}`}>
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
          <button className="ob-ghost" type="button" onClick={() => navigate("/onboarding/role")}>
            Back
          </button>
          <button className="ob-primary" type="button" onClick={() => void onContinue()} disabled={submitting || !selectedId}>
            {submitting ? "Saving..." : "Continue"}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}
