import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import { can, useBilling } from "@/features/billing/useBilling";
import { isBusiness, isSuperAdmin, isVerified, type CountrySummary } from "@/features/auth/types";
import { fetchCountries } from "@/features/onboarding/api";
import { pipelineTone, statusLabel } from "@/features/recruitment/api";
import {
  candidateLocation,
  favoriteCandidate,
  fetchCandidates,
  unfavoriteCandidate,
  type CandidateCard,
} from "../api";
import { CandidatePhoto } from "../CandidatePhoto";

const SPECIALTIES = [
  { value: "musculation", label: "Musculation" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "pilates", label: "Pilates" },
  { value: "rehab", label: "Réathlétisation" },
  { value: "nutrition", label: "Nutrition" },
  { value: "crossfit", label: "CrossFit" },
];

const AVAILABILITIES = [
  { value: "immediate", label: "Immédiate" },
  { value: "2_weeks", label: "Sous 2 semaines" },
  { value: "1_month", label: "Sous 1 mois" },
  { value: "to_discuss", label: "À convenir" },
];

const CONTRACTS = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "part_time", label: "Temps partiel" },
  { value: "internship", label: "Stage" },
  { value: "vacation", label: "Vacation" },
];

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}

export function CandidatesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [countryId, setCountryId] = useState(params.get("countryId") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [specialty, setSpecialty] = useState(params.get("specialty") ?? "");
  const [availability, setAvailability] = useState(params.get("availability") ?? "");
  const [contractType, setContractType] = useState(params.get("contractType") ?? "");
  const [language, setLanguage] = useState(params.get("language") ?? "");
  const [relocate, setRelocate] = useState(params.get("relocate") === "true");
  const [hasDiploma, setHasDiploma] = useState(params.get("hasDiploma") === "true");
  const [hasCertification, setHasCertification] = useState(params.get("hasCertification") === "true");
  const [sort, setSort] = useState<"date" | "relevance" | "experience">(
    params.get("sort") === "relevance" || params.get("sort") === "experience" ? params.get("sort") : "date",
  );
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<CandidateCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const billing = useBilling();
  const canSearch = isSuperAdmin(user) || (isBusiness(user) && isVerified(user));
  const advanced = can(billing, "hire.search.advanced");
  const canFavorite = can(billing, "hire.favorites");

  useNoIndex();

  useEffect(() => {
    fetchCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const filters = useMemo(
    () => ({
      q: query,
      countryId,
      city,
      title,
      specialty: advanced ? specialty : "",
      availability,
      contractType: advanced ? contractType : "",
      language: advanced ? language : "",
      relocate: advanced ? relocate : false,
      hasDiploma: advanced ? hasDiploma : false,
      hasCertification: advanced ? hasCertification : false,
      sort,
      page,
    }),
    [query, countryId, city, title, specialty, availability, contractType, language, relocate, hasDiploma, hasCertification, sort, page, advanced],
  );

  useEffect(() => {
    if (!canSearch || billing === null) {
      setLoading(billing === null && canSearch);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchCandidates(filters)
        .then((result) => {
          if (!cancelled) {
            setItems(result.items);
            setTotal(result.total);
            setSize(result.size);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err?.status === 403 ? "Accès refusé." : "Impossible de charger les candidats.");
            setItems([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, filters, billing]);

  if (!isBusiness(user) && !isSuperAdmin(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!canSearch) {
    return (
      <section>
        <div className="page-head">
          <div>
            <h1>Recherche de talents</h1>
            <p className="sub">Réservée aux salles / employeurs vérifiés par l’admin.</p>
          </div>
        </div>
        <p className="jobs-empty">
          <strong>Compte non vérifié</strong>
          <span>FitClub peut chercher dès que l’admin a validé le dossier. StudioX en attente n’a pas accès.</span>
        </p>
      </section>
    );
  }

  function applyParams(next: Record<string, string>) {
    const search = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });
    setParams(search, { replace: true });
  }

  function resetFilters() {
    setQuery("");
    setCountryId("");
    setCity("");
    setTitle("");
    setSpecialty("");
    setAvailability("");
    setContractType("");
    setLanguage("");
    setRelocate(false);
    setHasDiploma(false);
    setHasCertification(false);
    setSort("date");
    setPage(0);
    setParams(new URLSearchParams(), { replace: true });
  }

  async function toggleFavorite(item: CandidateCard) {
    if (item.favorite) {
      await unfavoriteCandidate(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, favorite: false } : row)));
    } else {
      await favoriteCandidate(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, favorite: true } : row)));
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / size));
  const activeCount =
    [query, title, countryId, city, availability, advanced ? specialty : "", advanced ? contractType : "", advanced ? language : ""].filter(Boolean).length +
    [advanced && relocate, advanced && hasDiploma, advanced && hasCertification].filter(Boolean).length;

  function onChangeFilter(setter: (value: string) => void) {
    return (event: { target: { value: string } }) => {
      setter(event.target.value);
      setPage(0);
    };
  }

  return (
    <section className="tlx-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Recherche de talents</h1>
          <p className="sub">Professionnels vérifiés qui cherchent un poste. Combinez les filtres, puis ouvrez une fiche.</p>
        </div>
      </div>

      <form
        className="tlx-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          applyParams({
            q: query,
            countryId,
            city,
            title,
            specialty,
            availability,
            contractType,
            language,
            relocate: relocate ? "true" : "",
            hasDiploma: hasDiploma ? "true" : "",
            hasCertification: hasCertification ? "true" : "",
            sort,
          });
        }}
      >
        <label className="tlx-search" htmlFor="hire-q">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input id="hire-q" value={query} placeholder="Rechercher un nom, une ville ou une spécialité…" onChange={onChangeFilter(setQuery)} />
          {query ? (
            <button
              type="button"
              className="tlx-clear"
              aria-label="Effacer la recherche"
              onClick={() => {
                setQuery("");
                setPage(0);
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          ) : null}
        </label>

        <div className="tlx-fields">
          <div className="tlx-field">
            <label htmlFor="hire-title">Métier</label>
            <input id="hire-title" value={title} placeholder="Coach, préparateur…" onChange={onChangeFilter(setTitle)} />
          </div>
          <div className="tlx-field">
            <label htmlFor="hire-country">Pays</label>
            <select id="hire-country" value={countryId} onChange={onChangeFilter(setCountryId)}>
              <option value="">Tous</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.flagEmoji} {country.name}
                </option>
              ))}
            </select>
          </div>
          <div className="tlx-field">
            <label htmlFor="hire-city">Ville</label>
            <input id="hire-city" value={city} placeholder="Tunis, Paris…" onChange={onChangeFilter(setCity)} />
          </div>
          <div className="tlx-field">
            <label htmlFor="hire-availability">Disponibilité</label>
            <select id="hire-availability" value={availability} onChange={onChangeFilter(setAvailability)}>
              <option value="">Toutes</option>
              {AVAILABILITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {advanced ? (
            <>
              <div className="tlx-field">
                <label htmlFor="hire-specialty">Spécialité</label>
                <select id="hire-specialty" value={specialty} onChange={onChangeFilter(setSpecialty)}>
                  <option value="">Toutes</option>
                  {SPECIALTIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tlx-field">
                <label htmlFor="hire-contract">Contrat</label>
                <select id="hire-contract" value={contractType} onChange={onChangeFilter(setContractType)}>
                  <option value="">Tous</option>
                  {CONTRACTS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tlx-field">
                <label htmlFor="hire-language">Langue</label>
                <input id="hire-language" value={language} placeholder="Français, anglais…" onChange={onChangeFilter(setLanguage)} />
              </div>
            </>
          ) : null}
          <div className="tlx-field">
            <label htmlFor="hire-sort">Trier par</label>
            <select id="hire-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="date">Plus récents</option>
              <option value="relevance">Pertinence</option>
              <option value="experience">Expérience</option>
            </select>
          </div>
        </div>

        <div className="tlx-filters-foot">
          {advanced ? (
            <div className="tlx-toggles">
              {[
                { label: "Prêt à déménager", icon: "flight_takeoff", value: relocate, set: setRelocate },
                { label: "Diplôme", icon: "school", value: hasDiploma, set: setHasDiploma },
                { label: "Certification", icon: "workspace_premium", value: hasCertification, set: setHasCertification },
              ].map((toggle) => (
                <button
                  key={toggle.label}
                  type="button"
                  className={toggle.value ? "tlx-toggle is-on" : "tlx-toggle"}
                  aria-pressed={toggle.value}
                  onClick={() => {
                    toggle.set(!toggle.value);
                    setPage(0);
                  }}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {toggle.value ? "check" : toggle.icon}
                  </span>
                  {toggle.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="tlx-upsell">
              <span className="material-symbols-outlined" aria-hidden="true">
                lock
              </span>
              Filtres avancés (spécialité, diplôme, mobilité) : <a href="/app/profile/plan">offre Pro</a>
            </p>
          )}
          <button type="button" className="tlx-reset" onClick={resetFilters} disabled={activeCount === 0}>
            <span className="material-symbols-outlined" aria-hidden="true">
              restart_alt
            </span>
            Réinitialiser{activeCount ? ` (${activeCount})` : ""}
          </button>
        </div>
      </form>

      {error ? <p className="auth-error">{error}</p> : null}

      {loading ? (
        <div className="tlx-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="tlx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="tlx-sk tlx-sk-avatar" />
              <span className="tlx-sk tlx-sk-line" />
              <span className="tlx-sk tlx-sk-line is-short" />
              <span className="tlx-sk tlx-sk-line" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="tlx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">
            person_search
          </span>
          <strong>Aucun talent trouvé</strong>
          <p>
            {activeCount
              ? "Aucun profil vérifié ne correspond à cette combinaison de filtres."
              : "Aucun professionnel vérifié n’est visible pour le moment."}
          </p>
          {activeCount ? (
            <button type="button" className="tlx-btn is-primary" onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className="tlx-count">
            <b>{total}</b> profil{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
          </p>
          <div className="tlx-grid">
            {items.map((item, index) => {
              const place = candidateLocation(item);
              return (
                <article key={item.id} className="tlx-card" style={{ "--i": index } as CSSProperties}>
                  <div className="tlx-head">
                    <div className="tlx-avatar">
                      <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={64} />
                    </div>
                    <div className="tlx-id">
                      <h3 className="tlx-name">
                        {item.displayName}
                        {item.verified ? (
                          <span className="tlx-verified material-symbols-outlined" title="Compte vérifié" aria-label="Compte vérifié">
                            verified
                          </span>
                        ) : null}
                      </h3>
                      <p className="tlx-title">{item.title || "Candidat"}</p>
                    </div>
                    {isBusiness(user) && canFavorite ? (
                      <button
                        type="button"
                        className={item.favorite ? "tlx-fav is-on" : "tlx-fav"}
                        aria-pressed={item.favorite}
                        aria-label={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                        title={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                        onClick={() => void toggleFavorite(item)}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">
                          favorite
                        </span>
                      </button>
                    ) : null}
                  </div>

                  <ul className="tlx-facts">
                    <li>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        location_on
                      </span>
                      {place || "Lieu non renseigné"}
                    </li>
                    {item.availabilityLabel ? (
                      <li>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          schedule
                        </span>
                        {item.availabilityLabel}
                      </li>
                    ) : null}
                  </ul>

                  {item.inPipeline && item.pipelineStatus ? (
                    <div>
                      <StatusPill tone={pipelineTone(item.pipelineStatus)}>{statusLabel(item.pipelineStatus)}</StatusPill>
                    </div>
                  ) : null}

                  {(item.specialties ?? []).length ? (
                    <div className="tlx-chips">
                      {(item.specialties ?? []).slice(0, 4).map((tag) => (
                        <span key={tag} className="tlx-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <Link className="tlx-cta" to={`/candidates/${item.id}`}>
                    Voir le profil
                    <span className="material-symbols-outlined" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
          {pageCount > 1 ? (
            <div className="tlx-pager">
              <button type="button" className="tlx-btn" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_back
                </span>
                Précédent
              </button>
              <span className="tlx-page-num">
                {page + 1} / {pageCount}
              </span>
              <button type="button" className="tlx-btn" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
                Suivant
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
