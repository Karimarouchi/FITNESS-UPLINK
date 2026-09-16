import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Badge } from "@/components/ui/Badge";
import { fetchProviders, fetchServiceCategories, providerLocation, type ProviderCard, type ServiceCategory } from "../api";
import { ProviderLogo } from "../ProviderLogo";

const ease = [0.16, 1, 0.3, 1] as const;

export function ProviderSearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<ProviderCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServiceCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const filters = useMemo(() => ({ q: query, categoryId, page }), [query, categoryId, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchProviders(filters)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setSize(result.size);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger les prestataires.");
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
          <h1>Trouver un prestataire</h1>
          <p className="sub">Partenaires B2B pour votre salle : technique, opérations, business, aménagement, expertise, contenu.</p>
        </div>
      </div>

      <form
        className="hire-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          applyParams({ q: query, categoryId });
        }}
      >
        <input placeholder="Nom, description, ville…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="solid" type="submit">
          Rechercher
        </Button>
      </form>

      {error ? <p className="auth-error mt-6">{error}</p> : null}

      {!loading && items.length === 0 && !error ? (
        <p className="jobs-empty">
          <strong>Aucun prestataire trouvé</strong>
          <span>Essayez d’élargir vos filtres.</span>
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className="muted-line">
            {total} prestataire{total > 1 ? "s" : ""}
          </p>
          <motion.div
            className="fu-talent-grid"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {items.map((item) => {
              const place = providerLocation(item);
              return (
                <motion.article
                  key={item.id}
                  className="fu-talent-card"
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.5, ease }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                  <div className="fu-talent-card-top">
                    <ProviderLogo providerId={item.id} uploadId={item.logoUploadId} name={item.displayName} size={56} />
                    <div>
                      <div className="pn">{item.displayName}</div>
                      {item.subscribed ? <Badge>Abonné</Badge> : null}
                      <div className="ploc">{place || "Lieu non renseigné"}</div>
                    </div>
                  </div>
                  {item.description ? <p className="fu-talent-meta">{item.description}</p> : null}
                  <div className="tag-row">
                    {item.categoryNames.slice(0, 4).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                  <div className="fu-talent-card-actions">
                    <Button variant="mini" to={`/services/providers/${item.id}`}>
                      Voir la fiche
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
