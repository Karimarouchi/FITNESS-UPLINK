import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { coachLocation, fetchCoaches, type CoachCard } from "../api";
import { CoachPhoto } from "../CoachPhoto";
import { RatingStars } from "../RatingStars";

const SPECIALTIES = [
  { value: "musculation", label: "Musculation" },
  { value: "hiit", label: "HIIT" },
  { value: "yoga", label: "Yoga" },
  { value: "pilates", label: "Pilates" },
  { value: "rehab", label: "Réathlétisation" },
  { value: "nutrition", label: "Nutrition" },
  { value: "crossfit", label: "CrossFit" },
];

const ease = [0.16, 1, 0.3, 1] as const;

export function CoachSearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [specialty, setSpecialty] = useState(params.get("specialty") ?? "");
  const [sort, setSort] = useState<"recent" | "rating" | "name">(
    (params.get("sort") as "recent" | "rating" | "name") ?? "recent",
  );
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<CoachCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => ({ q: query, city, specialty, sort, page }), [query, city, specialty, sort, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchCoaches(filters)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setSize(result.size);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger les coachs.");
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

  const pageCount = Math.max(1, Math.ceil(total / size));

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Trouver un coach</h1>
          <p className="sub">Recherchez un coach par spécialité, ville ou nom, puis réservez une séance.</p>
        </div>
      </div>

      <form
        className="hire-filters hire-filters--inline"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          applyParams({ q: query, city, specialty, sort });
        }}
      >
        <input placeholder="Nom, spécialité, ville…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="">Toutes spécialités</option>
          {SPECIALTIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="recent">Plus récents</option>
          <option value="rating">Mieux notés</option>
          <option value="name">Nom</option>
        </select>
        <Button variant="solid" type="submit">
          Rechercher
        </Button>
      </form>

      {error ? <p className="auth-error mt-6">{error}</p> : null}

      {!loading && items.length === 0 && !error ? (
        <p className="jobs-empty">
          <strong>Aucun coach trouvé</strong>
          <span>Essayez d’élargir vos filtres.</span>
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className="muted-line">
            {total} coach{total > 1 ? "s" : ""}
          </p>
          <motion.div
            className="fu-talent-grid"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {items.map((item) => {
              const place = coachLocation(item);
              return (
                <motion.article
                  key={item.id}
                  className="fu-talent-card"
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.5, ease }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <div className="fu-talent-card-top">
                    <CoachPhoto coachId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={56} />
                    <div>
                      <div className="pn">{item.displayName}</div>
                      <div className="pt">{item.title || "Coach sportif"}</div>
                      <div className="ploc">{place || "Lieu non renseigné"}</div>
                    </div>
                  </div>
                  <RatingStars value={item.averageRating} count={item.reviewCount} />
                  <div className="tag-row">
                    {(item.specialties ?? []).slice(0, 4).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                  {item.fromPriceAmount ? (
                    <p className="fu-talent-meta">
                      À partir de {item.fromPriceAmount} {item.fromPriceCurrency}
                    </p>
                  ) : null}
                  <div className="fu-talent-card-actions">
                    <Button variant="mini" to={`/coaches/${item.id}`}>
                      Voir le profil
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
          {pageCount > 1 ? (
            <div className="hire-pager">
              <Button variant="outline" type="button" disabled={page <= 0} onClick={() => setPage((c) => Math.max(0, c - 1))}>
                Précédent
              </Button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <Button variant="outline" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((c) => c + 1)}>
                Suivant
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
