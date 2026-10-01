import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { peekPath } from "@/features/auth/peek";
import {
  CatalogChips,
  CatalogEmpty,
  CatalogPager,
  CatalogSearch,
  CatalogSkeleton,
  CatalogToolbar,
  GuestNudge,
} from "@/features/home/public/Catalog";
import { PublicCta } from "@/features/home/public/PublicCta";
import { PublicHero } from "@/features/home/public/PublicHero";
import { CONTENT_TYPE_LABELS, fetchFormations, formationImageUrl, type FormationCard } from "../api";

const TYPE_OPTIONS = Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  if (!value) return "Gratuit";
  return `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}`;
}

function sessionLabel(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function AcademyLandingPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [contentType, setContentType] = useState(params.get("contentType") ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<FormationCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = useMemo(() => ({ q: query, contentType, page }), [query, contentType, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchFormations(filters)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setSize(result.size);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger les formations.");
            setItems([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters]);

  function applyParams(next: Record<string, string>) {
    const search = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    setParams(search, { replace: true });
  }

  function pickType(value: string) {
    setContentType(value);
    setPage(0);
    applyParams({ q: query, contentType: value });
  }

  function reset() {
    setQuery("");
    setContentType("");
    setPage(0);
    applyParams({});
  }

  const pageCount = Math.max(1, Math.ceil(total / size));
  const filtered = Boolean(query || contentType);

  return (
    <article>
      <PublicHero
        kicker="Académie"
        title="Former la force."
        lead="Formations, certifications, workshops et masterclass animés par les meilleurs du métier. Sessions, places, inscription et paiement sur le même compte."
        image="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=2000&q=70"
        highlights={[
          { icon: "workspace_premium", label: "Formations certifiantes" },
          { icon: "event_available", label: "Sessions en présentiel ou en ligne" },
          { icon: "bolt", label: "Inscription en 2 minutes" },
        ]}
      />
      <section className="pub-section pub-section-catalog">
        <div className="pub-wrap">
          <div className="cat-panel">
            <CatalogSearch
              value={query}
              placeholder="Rechercher une formation, un formateur…"
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
              onSubmit={() => applyParams({ q: query, contentType })}
            />
            <CatalogChips label="Type de formation" value={contentType} options={TYPE_OPTIONS} allLabel="Tout" onChange={pickType} />
          </div>

          {!loading && !error && items.length > 0 ? (
            <CatalogToolbar count={total} noun="formation" onReset={filtered ? reset : undefined} />
          ) : null}

          {error ? (
            <CatalogEmpty icon="cloud_off" title="Connexion interrompue" text={error} />
          ) : loading && items.length === 0 ? (
            <CatalogSkeleton wide />
          ) : items.length === 0 ? (
            <CatalogEmpty
              icon="school"
              title="Aucune formation trouvée"
              text="Essayez un autre mot-clé ou élargissez le type de formation."
              action={
                filtered ? (
                  <button className="pub-btn pub-btn-line ink" type="button" onClick={reset}>
                    Voir toutes les formations
                  </button>
                ) : null
              }
            />
          ) : (
            <div className={loading ? "cat-grid is-wide is-loading" : "cat-grid is-wide"}>
              {items.map((item) => {
                const date = sessionLabel(item.nextSessionAt);
                const seats = item.nextSessionSeatsLeft;
                return (
                  <Link className="cat-card" to={peekPath(user, `/academie/formations/${item.id}`)} key={item.id}>
                    <div className="cat-media">
                      {item.imageUploadId ? (
                        <img src={formationImageUrl(item.id, item.imageUploadId)} alt="" loading="lazy" />
                      ) : (
                        <span className="cat-ph material-symbols-outlined" aria-hidden="true">
                          school
                        </span>
                      )}
                      <div className="cat-tags">
                        <span>{CONTENT_TYPE_LABELS[item.contentType] ?? item.contentType}</span>
                        {item.hasCertification ? <span className="is-volt">Certifiant</span> : null}
                      </div>
                      {!user ? (
                        <span className="cat-lock">
                          <span className="material-symbols-outlined" aria-hidden="true">
                            lock
                          </span>
                          Membres
                        </span>
                      ) : null}
                    </div>
                    <div className="cat-body">
                      <h3>{item.title}</h3>
                      <p className="cat-sub">
                        {[item.trainerName, item.organizer?.name].filter(Boolean).join(" · ") || "Académie du réseau"}
                      </p>
                      <ul className="cat-meta">
                        <li>
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {item.online ? "videocam" : "location_on"}
                          </span>
                          {item.online ? "En ligne" : item.location || "Présentiel"}
                        </li>
                        {date ? (
                          <li>
                            <span className="material-symbols-outlined" aria-hidden="true">
                              calendar_month
                            </span>
                            {date}
                          </li>
                        ) : null}
                        {item.language ? (
                          <li>
                            <span className="material-symbols-outlined" aria-hidden="true">
                              translate
                            </span>
                            {item.language}
                          </li>
                        ) : null}
                      </ul>
                      <div className="cat-foot">
                        <b>{formatPrice(item.priceAmount, item.priceCurrency)}</b>
                        {seats != null ? (
                          <span className={seats <= 5 ? "cat-seats is-hot" : "cat-seats"}>
                            {seats <= 0 ? "Complet" : `${seats} place${seats > 1 ? "s" : ""}`}
                          </span>
                        ) : (
                          <span className="cat-go material-symbols-outlined" aria-hidden="true">
                            arrow_forward
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <CatalogPager page={page} pageCount={pageCount} onChange={setPage} />

          {!user && items.length > 0 ? (
            <GuestNudge text="Programme détaillé, sessions, places restantes et inscription : tout s’ouvre avec un compte gratuit." />
          ) : null}
        </div>
      </section>
      <PublicCta
        kicker="Vous formez des pros ?"
        title="Publiez vos formations sur le réseau."
        lead="Académies et centres de formation : sessions, capacité, inscriptions et paiements — face aux professionnels déjà présents."
        primaryTo={user ? "/app/dashboard" : "/signup"}
        primaryLabel={user ? "Tableau de bord" : "Créer mon compte"}
        secondaryTo="/tarifs"
        secondaryLabel="Voir les tarifs"
      />
    </article>
  );
}
