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
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { UsersModal } from "@/features/users/UsersModal";
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
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

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

  const SORTS: { value: Sort; label: string }[] = [
    { value: "recent", label: "Modifiés récemment" },
    { value: "views", label: "Les plus vus" },
    { value: "name", label: "Nom (A → Z)" },
  ];

  return (
    <section className="bo-dash bo-users bo-bm bo-mp">
      <header className="bo-dash-head">
        <div>
          <h1>Mes articles</h1>
          <p>
            Publiez votre matériel de sport : les acheteurs intéressés vous écrivent directement via la messagerie de la
            plateforme.
          </p>
        </div>
        <div className="sd-head-actions">
          <a className="bm-btn is-outline" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Voir la vitrine
          </a>
          <button type="button" className="bm-btn" onClick={() => setEditing(null)}>
            <PackagePlus size={16} aria-hidden="true" />
            Nouvel article
          </button>
        </div>
      </header>

      {counts.HIDDEN > 0 ? (
        <p className="bo-dash-error" role="alert">
          <ShieldAlert size={16} aria-hidden="true" className="mp-alert-icon" />
          {counts.HIDDEN} article{counts.HIDDEN > 1 ? "s" : ""} masqué{counts.HIDDEN > 1 ? "s" : ""} par la modération. Ouvrez-les
          pour voir le motif et corriger l’annonce.
        </p>
      ) : null}
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        <div className="bo-users-toolbar">
          <div className="bo-users-tabs" role="tablist" aria-label="Filtrer les articles">
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
                <span>{counts[item.id]}</span>
              </button>
            ))}
          </div>
          <label className="bo-users-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              placeholder="Rechercher un article…"
              aria-label="Rechercher un article"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="bo-users-filters">
            <DashSelect label="Trier" value={sort} options={SORTS} onChange={setSort} />
          </div>
        </div>

        {products === null ? (
          <div className="mp-grid" aria-busy="true">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="bo-skeleton mp-skel" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="bo-users-empty">
            <span>
              <Package size={22} aria-hidden="true" />
            </span>
            <strong>{products.length === 0 ? "Aucun article pour l’instant" : "Aucun résultat"}</strong>
            <p>
              {products.length === 0
                ? "Ajoutez votre premier article : vélos, haltères, textiles, nutrition… Tout ce qui touche au sport."
                : "Modifiez la recherche ou le filtre pour retrouver vos articles."}
            </p>
            {products.length === 0 ? (
              <button type="button" className="bm-btn" onClick={() => setEditing(null)}>
                <PackagePlus size={16} aria-hidden="true" />
                Créer un article
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mp-grid">
            {visible.map((product) => {
              const status = productStatus(product);
              const price = formatPrice(product.priceAmount, product.priceCurrency);
              const cover = product.photoUploadIds[0];
              return (
                <article className="mp-card" key={product.id}>
                  <div className="mp-media">
                    {cover ? <img src={productPhotoUrl(product.id, cover)} alt="" loading="lazy" /> : <ImageIcon size={32} aria-hidden="true" />}
                    <span className={`bo-users-status mp-status ${status.tone}`}>{status.label}</span>
                    {product.photoUploadIds.length > 1 ? (
                      <span className="mp-photos">
                        <ImageIcon size={12} aria-hidden="true" />
                        {product.photoUploadIds.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mp-body">
                    <div className="mp-cat">
                      {product.categoryName} · {conditionLabel(product.condition)}
                    </div>
                    <h3 className="mp-name">{product.name}</h3>
                    {price ? <div className="mp-price">{price}</div> : <div className="mp-price is-muted">Prix sur demande</div>}
                    <div className="mp-meta">
                      <span title="Vues">
                        <Eye size={14} aria-hidden="true" />
                        {compactNumber(product.viewCount)}
                      </span>
                      <span>Modifié {timeAgo(product.updatedAt)}</span>
                    </div>
                    {product.hiddenByAdmin && product.hiddenReason ? (
                      <p className="mp-reason">
                        <strong>Motif :</strong> {product.hiddenReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="mp-actions">
                    <button type="button" className="bo-users-btn" onClick={() => setEditing(product)}>
                      <Pencil size={14} aria-hidden="true" />
                      Modifier
                    </button>
                    {!product.hiddenByAdmin ? (
                      <button
                        type="button"
                        className="bo-users-icon"
                        disabled={busyId === product.id}
                        title={product.active ? "Repasser en brouillon" : "Publier"}
                        aria-label={product.active ? "Repasser en brouillon" : "Publier"}
                        onClick={() => void togglePublish(product)}
                      >
                        {product.active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    ) : null}
                    {product.active && !product.hiddenByAdmin ? (
                      <a
                        className="bo-users-icon"
                        href={`/marketplace/products/${product.id}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Voir l’annonce"
                        aria-label="Voir l’annonce"
                      >
                        <ExternalLink size={16} />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="bo-users-icon is-danger"
                      title="Supprimer"
                      aria-label="Supprimer"
                      onClick={() => setDeleting(product)}
                    >
                      <Trash2 size={16} />
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
        <UsersModal
          title="Supprimer cet article ?"
          subtitle={deleting.name}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="um-btn" data-autofocus onClick={() => setDeleting(null)}>
                Annuler
              </button>
              <button type="button" className="um-btn is-danger" disabled={busyId === deleting.id} onClick={() => void confirmDelete()}>
                <Trash2 size={15} aria-hidden="true" />
                Supprimer
              </button>
            </>
          }
        >
          <p className="mp-delete-note">
            L’annonce disparaît du catalogue. Les conversations existantes restent accessibles dans{" "}
            <MessagesSquare size={14} aria-hidden="true" /> Messages.
          </p>
        </UsersModal>
      ) : null}
    </section>
  );
}
