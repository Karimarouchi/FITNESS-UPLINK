import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tag } from "@/components/ui/Tag";
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

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Recherche de talents</h1>
          <p className="sub">
            Professionnels vérifiés qui cherchent un poste. Combinez les filtres, puis ouvrez une fiche.
          </p>
        </div>
      </div>

      <form
        className="hire-filters"
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
        <div className="field">
          <label htmlFor="hire-q">Recherche</label>
          <input id="hire-q" value={query} placeholder="Nom, ville ou spécialité" onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
        </div>
        <div className="field">
          <label htmlFor="hire-title">Métier</label>
          <input id="hire-title" value={title} placeholder="Coach, préparateur…" onChange={(event) => { setTitle(event.target.value); setPage(0); }} />
        </div>
        <div className="field">
          <label htmlFor="hire-country">Pays</label>
          <select id="hire-country" value={countryId} onChange={(event) => { setCountryId(event.target.value); setPage(0); }}>
            <option value="">Tous</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.flagEmoji} {country.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="hire-city">Ville</label>
          <input id="hire-city" value={city} placeholder="Tunis, Paris…" onChange={(event) => { setCity(event.target.value); setPage(0); }} />
        </div>
        {advanced ? (
        <div className="field">
          <label htmlFor="hire-specialty">Spécialité</label>
          <select id="hire-specialty" value={specialty} onChange={(event) => { setSpecialty(event.target.value); setPage(0); }}>
            <option value="">Toutes</option>
            {SPECIALTIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        ) : null}
        <div className="field">
          <label htmlFor="hire-availability">Disponibilité</label>
          <select id="hire-availability" value={availability} onChange={(event) => { setAvailability(event.target.value); setPage(0); }}>
            <option value="">Toutes</option>
            {AVAILABILITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {advanced ? (
        <div className="field">
          <label htmlFor="hire-contract">Contrat</label>
          <select id="hire-contract" value={contractType} onChange={(event) => { setContractType(event.target.value); setPage(0); }}>
            <option value="">Tous</option>
            {CONTRACTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        ) : null}
        {advanced ? (
        <div className="field">
          <label htmlFor="hire-language">Langue</label>
          <input id="hire-language" value={language} placeholder="Français, anglais…" onChange={(event) => { setLanguage(event.target.value); setPage(0); }} />
        </div>
        ) : null}
        <div className="field">
          <label htmlFor="hire-sort">Tri</label>
          <select id="hire-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="date">Plus récents</option>
            <option value="relevance">Pertinence</option>
            <option value="experience">Expérience</option>
          </select>
        </div>
        {advanced ? (
          <>
            <label className="hire-check">
              <input type="checkbox" checked={relocate} onChange={(event) => { setRelocate(event.target.checked); setPage(0); }} />
              Prêt à déménager
            </label>
            <label className="hire-check">
              <input type="checkbox" checked={hasDiploma} onChange={(event) => { setHasDiploma(event.target.checked); setPage(0); }} />
              Diplôme
            </label>
            <label className="hire-check">
              <input type="checkbox" checked={hasCertification} onChange={(event) => { setHasCertification(event.target.checked); setPage(0); }} />
              Certification
            </label>
          </>
        ) : (
          <p className="empty-hint">
            Filtres avancés (spécialité, diplôme, mobilité) : <a href="/app/profile/plan">offre Pro</a>.
          </p>
        )}
        <div className="head-actions hire-filter-actions">
          <Button variant="outline" type="button" onClick={resetFilters}>
            Réinitialiser
          </Button>
        </div>
      </form>

      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? <p className="empty-hint">Chargement des profils…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="jobs-empty">
          <strong>Aucun talent</strong>
          <span>
            {query.trim() || city.trim() || specialty || countryId
              ? "Aucun profil vérifié ne correspond à cette combinaison de filtres."
              : "Aucun professionnel vérifié n’est visible pour le moment."}
          </span>
        </p>
      ) : null}
      {!loading && items.length > 0 ? (
        <>
          <p className="muted-line">{total} profil{total > 1 ? "s" : ""}</p>
          <div className="fu-talent-grid">
            {items.map((item) => {
              const place = candidateLocation(item);
              return (
                <article key={item.id} className="fu-talent-card">
                  <div className="fu-talent-card-top">
                    <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={56} />
                    <div>
                      <div className="pn">{item.displayName}</div>
                      {item.verified ? <Badge>Compte vérifié</Badge> : null}
                      <div className="pt">{item.title || "Candidat"}</div>
                      <div className="ploc">{place || "Lieu non renseigné"}</div>
                    </div>
                  </div>
                  {item.availabilityLabel ? <p className="fu-talent-meta">{item.availabilityLabel}</p> : null}
                  {item.inPipeline && item.pipelineStatus ? (
                    <StatusPill tone={pipelineTone(item.pipelineStatus)}>{statusLabel(item.pipelineStatus)}</StatusPill>
                  ) : null}
                  <div className="tag-row">
                    {(item.specialties ?? []).slice(0, 4).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                  <div className="fu-talent-card-actions">
                    {isBusiness(user) && canFavorite ? (
                      <Button variant={item.favorite ? "primary" : "outline"} type="button" onClick={() => void toggleFavorite(item)}>
                        {item.favorite ? "Favori" : "Ajouter aux favoris"}
                      </Button>
                    ) : null}
                    <Button variant="mini" to={`/candidates/${item.id}`}>
                      Voir le profil
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          {pageCount > 1 ? (
            <div className="hire-pager">
              <Button variant="outline" type="button" disabled={page <= 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                Précédent
              </Button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <Button variant="outline" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>
                Suivant
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
