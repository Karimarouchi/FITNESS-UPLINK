import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessagesSquare,
  Package,
  PackagePlus,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { BoModal } from "@/components/ui/BoOverlay";
import { ApiError } from "@/shared/api/client";
import {
  conditionLabel,
  deleteProduct,
  fetchMyProducts,
  fetchProductCategories,
  formatPrice,
  productPhotoUrl,
  saveProduct,
  type Product,
  type ProductCategory,
} from "../api";
import { compactNumber, productStatus, timeAgo } from "../format";
import { ProductEditorDrawer } from "../ProductEditorDrawer";

type Filter = "ALL" | "PUBLISHED" | "DRAFT" | "HIDDEN";
type Sort = "recent" | "views" | "name";

function matchesFilter(product: Product, filter: Filter) {
  if (filter === "PUBLISHED") return product.active && !product.hiddenByAdmin;
  if (filter === "DRAFT") return !product.active && !product.hiddenByAdmin;
  if (filter === "HIDDEN") return product.hiddenByAdmin;
  return true;
}

export function MyProductsPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchMyProducts()
      .then(setProducts)
      .catch(() => {
        setProducts([]);
        setError("Impossible de charger vos articles.");
      });
  }

  useEffect(() => {
    load();
    fetchProductCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setQuery(params.get("q") ?? "");
    if (params.get("new") === "1") {
      setEditing(null);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const counts = useMemo(() => {
    const list = products ?? [];
    return {
      ALL: list.length,
      PUBLISHED: list.filter((p) => matchesFilter(p, "PUBLISHED")).length,
      DRAFT: list.filter((p) => matchesFilter(p, "DRAFT")).length,
      HIDDEN: list.filter((p) => matchesFilter(p, "HIDDEN")).length,
    };
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (products ?? []).filter(
      (p) =>
        matchesFilter(p, filter) &&
        (!q || [p.name, p.brand, p.categoryName].some((value) => value?.toLowerCase().includes(q))),
    );
    return [...list].sort((a, b) => {
      if (sort === "views") return b.viewCount - a.viewCount;
      if (sort === "name") return a.name.localeCompare(b.name, "fr");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [products, filter, query, sort]);

  async function togglePublish(product: Product) {
    setBusyId(product.id);
    setError(null);
    try {
      const saved = await saveProduct(product.id, {
        categoryId: product.categoryId,
        name: product.name,
        brand: product.brand,
        description: product.description,
        technicalSheet: product.technicalSheet,
        priceAmount: product.priceAmount,
        priceCurrency: product.priceCurrency,
        photoUploadIds: product.photoUploadIds,
        videos: product.videos,
        active: !product.active,
        condition: product.condition,
      });
      setProducts((current) => current?.map((item) => (item.id === saved.id ? saved : item)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await deleteProduct(deleting.id);
      setProducts((current) => current?.filter((item) => item.id !== deleting.id) ?? null);
      setDeleting(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  }

  function onSaved(saved: Product) {
    setProducts((current) => {
      const list = current ?? [];
      return list.some((item) => item.id === saved.id)
        ? list.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...list];
    });
    setEditing(undefined);
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "ALL", label: "Tous" },
    { id: "PUBLISHED", label: "Publiés" },
    { id: "DRAFT", label: "Brouillons" },
    { id: "HIDDEN", label: "Masqués" },
  ];

  return (
    <section className="bo-page">
      <div className="bo-head">
        <div>
          <h1>Mes articles</h1>
          <p>
            Publiez votre matériel de sport : les acheteurs intéressés vous écrivent directement via la messagerie de la
            plateforme.
          </p>
        </div>
        <div className="bo-head-actions">
          <a className="bo-btn" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Voir la vitrine
          </a>
          <button type="button" className="bo-btn bo-btn--primary" onClick={() => setEditing(null)}>
            <PackagePlus size={16} />
            Nouvel article
          </button>
        </div>
      </div>

      {counts.HIDDEN > 0 ? (
        <div className="bo-alert is-danger" style={{ marginBottom: 16 }}>
          <ShieldAlert size={18} />
          <div>
            <strong>
              {counts.HIDDEN} article{counts.HIDDEN > 1 ? "s" : ""} masqué{counts.HIDDEN > 1 ? "s" : ""} par la modération.
            </strong>{" "}
            Ouvrez-les pour voir le motif et corriger l’annonce.
          </div>
        </div>
      ) : null}
      {error ? <p className="bo-error">{error}</p> : null}

      <div className="bo-card">
        <div className="bo-toolbar">
          <div className="bo-seg" role="tablist">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "is-active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                <span className="bo-seg-count">{counts[item.id]}</span>
              </button>
            ))}
          </div>
          <div className="bo-toolbar-spacer" />
          <div className="bo-toolbar-search">
            <Search size={16} />
            <input
              className="bo-input"
              value={query}
              placeholder="Rechercher un article…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select className="bo-select" value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Trier">
            <option value="recent">Modifiés récemment</option>
            <option value="views">Les plus vus</option>
            <option value="name">Nom (A → Z)</option>
          </select>
        </div>

        {products === null ? (
          <div className="bo-product-grid">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="bo-skeleton" style={{ height: 300 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bo-empty">
            <div className="bo-empty-icon">
              <Package size={24} />
            </div>
            <div className="bo-empty-title">{products.length === 0 ? "Aucun article pour l’instant" : "Aucun résultat"}</div>
            <p>
              {products.length === 0
                ? "Ajoutez votre premier article : vélos, haltères, textiles, nutrition… Tout ce qui touche au sport."
                : "Modifiez la recherche ou le filtre pour retrouver vos articles."}
            </p>
            {products.length === 0 ? (
              <button type="button" className="bo-btn bo-btn--primary" onClick={() => setEditing(null)}>
                <PackagePlus size={16} />
                Créer un article
              </button>
            ) : null}
          </div>
        ) : (
          <div className="bo-product-grid">
            {visible.map((product) => {
              const status = productStatus(product);
              const price = formatPrice(product.priceAmount, product.priceCurrency);
              const cover = product.photoUploadIds[0];
              return (
                <article className="bo-product" key={product.id}>
                  <div className="bo-product-media">
                    {cover ? <img src={productPhotoUrl(product.id, cover)} alt="" loading="lazy" /> : <ImageIcon size={32} />}
                    <span className={`bo-pill ${status.tone}`}>{status.label}</span>
                    {product.photoUploadIds.length > 1 ? (
                      <span className="bo-product-photos">
                        <ImageIcon size={12} />
                        {product.photoUploadIds.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="bo-product-body">
                    <div className="bo-product-cat">
                      {product.categoryName} · {conditionLabel(product.condition)}
                    </div>
                    <div className="bo-product-name">{product.name}</div>
                    {price ? (
                      <div className="bo-product-price">{price}</div>
                    ) : (
                      <div className="bo-product-price is-muted">Prix sur demande</div>
                    )}
                    <div className="bo-product-meta">
                      <span title="Vues">
                        <Eye size={14} />
                        {compactNumber(product.viewCount)}
                      </span>
                      <span>Modifié {timeAgo(product.updatedAt)}</span>
                    </div>
                  </div>
                  {product.hiddenByAdmin && product.hiddenReason ? (
                    <div className="bo-product-mod">
                      <strong>Motif :</strong> {product.hiddenReason}
                    </div>
                  ) : null}
                  <div className="bo-product-actions">
                    <button type="button" className="bo-btn bo-btn--sm" onClick={() => setEditing(product)}>
                      <Pencil size={14} />
                      Modifier
                    </button>
                    {!product.hiddenByAdmin ? (
                      <button
                        type="button"
                        className="bo-btn bo-btn--sm bo-btn--icon"
                        disabled={busyId === product.id}
                        title={product.active ? "Repasser en brouillon" : "Publier"}
                        aria-label={product.active ? "Repasser en brouillon" : "Publier"}
                        onClick={() => void togglePublish(product)}
                      >
                        {product.active ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    ) : null}
                    {product.active && !product.hiddenByAdmin ? (
                      <a
                        className="bo-btn bo-btn--sm bo-btn--icon"
                        href={`/marketplace/products/${product.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Voir l’annonce"
                        aria-label="Voir l’annonce"
                      >
                        <ExternalLink size={15} />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="bo-btn bo-btn--sm bo-btn--icon bo-btn--danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      onClick={() => setDeleting(product)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {editing !== undefined ? (
        <ProductEditorDrawer
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={onSaved}
        />
      ) : null}

      {deleting ? (
        <BoModal
          title="Supprimer cet article ?"
          subtitle={deleting.name}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="bo-btn" onClick={() => setDeleting(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="bo-btn bo-btn--danger-solid"
                disabled={busyId === deleting.id}
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={15} />
                Supprimer
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--bo-text-2)" }}>
            L’annonce disparaît du catalogue. Les conversations existantes restent accessibles dans{" "}
            <MessagesSquare size={14} style={{ verticalAlign: "-2px" }} /> Messages.
          </p>
        </BoModal>
      ) : null}
    </section>
  );
}
