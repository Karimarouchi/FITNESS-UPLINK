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
import { fetchProductCategories, fetchProducts, productPhotoUrl, type ProductCard, type ProductCategory } from "../api";

function formatPrice(amount: string | null, currency: string | null) {
  if (amount == null || Number(amount) <= 0) return "Sur devis";
  return `${new Intl.NumberFormat("fr-FR").format(Number(amount))} ${currency ?? ""}`.trim();
}

export function ProductCatalogPage() {
  const { user } = useAuth();
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
  const filters = useMemo(() => ({ q: query, categoryId, page }), [query, categoryId, page]);

  useEffect(() => {
    fetchProductCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

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

  function pickCategory(value: string) {
    setCategoryId(value);
    setPage(0);
    applyParams({ q: query, categoryId: value });
  }

  function reset() {
    setQuery("");
    setCategoryId("");
    setPage(0);
    applyParams({});
  }

  const pageCount = Math.max(1, Math.ceil(total / size));
  const filtered = Boolean(query || categoryId);
  const categoryOptions = categories
    .filter((category) => category.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ value: category.id, label: category.name }));

  return (
    <article>
      <PublicHero
        kicker="Marketplace"
        title="Équiper le circuit."
        lead="Musculation, cardio, HYROX, Pilates, récupération… Les catalogues des fournisseurs vérifiés, et une demande de devis en un clic."
        image="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=70"
        highlights={[
          { icon: "verified", label: "Fournisseurs vérifiés" },
          { icon: "request_quote", label: "Devis ciblé, sans engagement" },
          { icon: "local_shipping", label: "Pour salles, studios et coachs" },
        ]}
      />
      <section className="pub-section pub-section-catalog">
        <div className="pub-wrap">
          <div className="cat-panel">
            <CatalogSearch
              value={query}
              placeholder="Rechercher un produit, une marque…"
              onChange={(value) => {
                setQuery(value);
                setPage(0);
              }}
              onSubmit={() => applyParams({ q: query, categoryId })}
            />
            {categoryOptions.length ? (
              <CatalogChips
                label="Catégorie"
                value={categoryId}
                options={categoryOptions}
                allLabel="Toutes catégories"
                onChange={pickCategory}
              />
            ) : null}
          </div>

          {!loading && !error && items.length > 0 ? (
            <CatalogToolbar count={total} noun="produit" onReset={filtered ? reset : undefined} />
          ) : null}

          {error ? (
            <CatalogEmpty icon="cloud_off" title="Connexion interrompue" text={error} />
          ) : loading && items.length === 0 ? (
            <CatalogSkeleton count={8} />
          ) : items.length === 0 ? (
            <CatalogEmpty
              icon="inventory_2"
              title="Aucun produit trouvé"
              text="Essayez une autre marque, un autre mot-clé ou une autre catégorie."
              action={
                filtered ? (
                  <button className="pub-btn pub-btn-line ink" type="button" onClick={reset}>
                    Voir tout le catalogue
                  </button>
                ) : null
              }
            />
          ) : (
            <div className={loading ? "cat-grid is-loading" : "cat-grid"}>
              {items.map((item) => (
                <Link className="cat-card" to={peekPath(user, `/marketplace/products/${item.id}`)} key={item.id}>
                  <div className="cat-media is-square">
                    {item.firstPhotoUploadId ? (
                      <img src={productPhotoUrl(item.id, item.firstPhotoUploadId)} alt="" loading="lazy" />
                    ) : (
                      <span className="cat-ph material-symbols-outlined" aria-hidden="true">
                        fitness_center
                      </span>
                    )}
                    <div className="cat-tags">
                      <span>{item.categoryName}</span>
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
                    {item.brand ? <p className="cat-eyebrow">{item.brand}</p> : null}
                    <h3>{item.name}</h3>
                    <p className="cat-sub">
                      <span className="material-symbols-outlined" aria-hidden="true">
                        storefront
                      </span>
                      {item.supplier?.displayName ?? "Fournisseur vérifié"}
                      {item.supplier?.city ? ` · ${item.supplier.city}` : ""}
                    </p>
                    <div className="cat-foot">
                      <b>{formatPrice(item.priceAmount, item.priceCurrency)}</b>
                      <span className="cat-cta">
                        Devis
                        <span className="material-symbols-outlined" aria-hidden="true">
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <CatalogPager page={page} pageCount={pageCount} onChange={setPage} />

          {!user && items.length > 0 ? (
            <GuestNudge text="Fiches techniques, photos, vidéos et demandes de devis aux fournisseurs : tout s’ouvre avec un compte gratuit." />
          ) : null}
        </div>
      </section>
      <PublicCta
        kicker="Vous êtes fournisseur ?"
        title="Mettez votre catalogue face aux salles."
        lead="Vitrine, fiches produits et demandes de devis qualifiées, venant de salles et de pros déjà présents sur le réseau."
        primaryTo={user ? "/app/dashboard" : "/signup"}
        primaryLabel={user ? "Tableau de bord" : "Ouvrir ma vitrine"}
        secondaryTo="/tarifs"
        secondaryLabel="Voir les tarifs"
      />
    </article>
  );
}
