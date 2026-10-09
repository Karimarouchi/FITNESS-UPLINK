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
import {
  CONDITION_LABELS,
  conditionLabel,
  fetchProductCategories,
  fetchProducts,
  formatPrice,
  productPhotoUrl,
  type ItemCondition,
  type ProductCard,
  type ProductCategory,
} from "../api";

const CONDITION_OPTIONS = (Object.keys(CONDITION_LABELS) as ItemCondition[]).map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}));

export function ProductCatalogPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [condition, setCondition] = useState<ItemCondition | "">((params.get("condition") as ItemCondition) ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = useMemo(() => ({ q: query, categoryId, condition, page }), [query, categoryId, condition, page]);

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
    applyParams({ q: query, categoryId: value, condition });
  }

  function pickCondition(value: string) {
    setCondition(value as ItemCondition | "");
    setPage(0);
    applyParams({ q: query, categoryId, condition: value });
  }

  function reset() {
    setQuery("");
    setCategoryId("");
    setCondition("");
    setPage(0);
    applyParams({});
  }

  const pageCount = Math.max(1, Math.ceil(total / size));
  const filtered = Boolean(query || categoryId || condition);
  const categoryOptions = categories
    .filter((category) => category.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({ value: category.id, label: category.name }));

  return (
    <article>
      <PublicHero
        kicker="Marketplace"
        title="Tout le matériel du sport."
        lead="Musculation, running, cyclisme, sports de raquette, textile, nutrition… Repérez un article, écrivez au fournisseur et convenez ensemble du prix et de la remise."
        image="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=70"
        highlights={[
          { icon: "verified", label: "Fournisseurs de la plateforme" },
          { icon: "forum", label: "Contact direct par messagerie" },
          { icon: "sell", label: "Neuf, comme neuf ou occasion" },
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
            <CatalogChips
              label="État"
              value={condition}
              options={CONDITION_OPTIONS}
              allLabel="Tous les états"
              onChange={pickCondition}
            />
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
                      {item.condition && item.condition !== "NEW" ? <span>{conditionLabel(item.condition)}</span> : null}
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
                      <b>{formatPrice(item.priceAmount, item.priceCurrency) ?? "Prix sur demande"}</b>
                      <span className="cat-cta">
                        Contacter
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
            <GuestNudge text="Fiches techniques, photos, vidéos et messagerie directe avec les fournisseurs : tout s’ouvre avec un compte gratuit." />
          ) : null}
        </div>
      </section>
      <PublicCta
        kicker="Vous êtes fournisseur ?"
        title="Mettez vos articles face aux sportifs."
        lead="Publiez votre matériel en quelques minutes, avec ou sans prix, et échangez directement avec les acheteurs intéressés."
        primaryTo={user ? "/app/dashboard" : "/signup"}
        primaryLabel={user ? "Tableau de bord" : "Ouvrir ma vitrine"}
        secondaryTo="/tarifs"
        secondaryLabel="Voir les tarifs"
      />
    </article>
  );
}
