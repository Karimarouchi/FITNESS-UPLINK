import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { fetchProductCategories, fetchProducts, productPhotoUrl, type ProductCard, type ProductCategory } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

export function ProductCatalogPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProductCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const filters = useMemo(() => ({ q: query, categoryId, page }), [query, categoryId, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchProducts(filters)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setSize(result.size);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger le catalogue.");
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
    <section style={{ padding: "48px" }}>
      <div className="page-head">
        <div>
          <h1>Marketplace matériel</h1>
          <p className="sub">Vitrines fournisseurs et fiches produits. Demandez un devis en quelques secondes.</p>
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
        <input placeholder="Nom, marque…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <strong>Aucun produit trouvé</strong>
          <span>Essayez d’élargir vos filtres.</span>
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className="muted-line">
            {total} produit{total > 1 ? "s" : ""}
          </p>
          <motion.div
            className="fu-talent-grid"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {items.map((item) => (
              <motion.article
                key={item.id}
                className="fu-talent-card"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                {item.firstPhotoUploadId ? (
                  <img
                    src={productPhotoUrl(item.id, item.firstPhotoUploadId)}
                    alt={item.name}
                    style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", marginBottom: 10 }}
                  />
                ) : null}
                <div className="pn">{item.name}</div>
                {item.brand ? <div className="pt">{item.brand}</div> : null}
                <div className="ploc">{item.supplier?.displayName ?? "Fournisseur"}</div>
                <div className="tag-row">
                  <Tag>{item.categoryName}</Tag>
                </div>
                {item.priceAmount ? (
                  <p className="fu-talent-meta">
                    À partir de {item.priceAmount} {item.priceCurrency}
                  </p>
                ) : (
                  <p className="fu-talent-meta">Prix sur devis</p>
                )}
                <div className="fu-talent-card-actions">
                  <Button variant="mini" to={`/marketplace/products/${item.id}`}>
                    Voir le produit
                  </Button>
                </div>
              </motion.article>
            ))}
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
