import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  ImageOff,
  Info,
  Mail,
  MapPin,
  Layers,
  MessagesSquare,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { BoDrawer } from "@/components/ui/BoOverlay";
import { UsersModal } from "@/features/users/UsersModal";
import { ApiError } from "@/shared/api/client";
import {
  conditionLabel,
  fetchAdminMarketplaceStats,
  fetchAdminProducts,
  fetchAdminSuppliers,
  fetchProductCategories,
  formatPrice,
  hideProduct,
  productPhotoUrl,
  unhideProduct,
  type AdminMarketplaceStats,
  type AdminProductRow,
  type AdminProductStatus,
  type AdminSupplierRow,
  type ProductCategory,
} from "@/features/marketplace/api";
import { compactNumber, shortDate, timeAgo } from "@/features/marketplace/format";

import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-verifications.css";
import "@/shared/styles/backoffice-marketplace.css";

const PAGE_SIZE = 20;

const QUICK_REASONS = [
  "Article sans rapport avec le sport",
  "Photos inappropriées ou trompeuses",
  "Description mensongère",
  "Doublon d’une autre annonce",
  "Produit interdit à la vente",
];

const STATUS_TABS: { id: AdminProductStatus; label: string }[] = [
  { id: "ALL", label: "Tous" },
  { id: "VISIBLE", label: "En ligne" },
  { id: "HIDDEN", label: "Masqués" },
  { id: "INACTIVE", label: "Brouillons" },
];

function rowStatus(row: AdminProductRow) {
  if (row.hiddenByAdmin) return { label: "Masqué", tone: "is-danger" };
  if (!row.active) return { label: "Brouillon", tone: "is-warn" };
  return { label: "En ligne", tone: "is-success" };
}

export function AdminMarketplacePage() {
  const [tab, setTab] = useState<"products" | "suppliers">("products");
  const [stats, setStats] = useState<AdminMarketplaceStats | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplierRow[] | null>(null);
  const [rows, setRows] = useState<AdminProductRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<AdminProductStatus>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hiding, setHiding] = useState<AdminProductRow | null>(null);
  const [detail, setDetail] = useState<AdminProductRow | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    fetchAdminMarketplaceStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    loadStats();
    fetchProductCategories().then(setCategories).catch(() => setCategories([]));
    fetchAdminSuppliers().then(setSuppliers).catch(() => setSuppliers([]));
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debounced, status, categoryId, supplierId]);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    fetchAdminProducts({ q: debounced, status, categoryId, supplierId, page, size: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRows(result.items);
        setTotal(result.total);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setError("Impossible de charger les articles.");
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, status, categoryId, supplierId, page]);

  function replaceRow(updated: AdminProductRow) {
    setRows((current) => {
      if (!current) return current;
      const stillMatches =
        status === "ALL" ||
        (status === "HIDDEN" && updated.hiddenByAdmin) ||
        (status === "VISIBLE" && updated.active && !updated.hiddenByAdmin) ||
        (status === "INACTIVE" && !updated.active);
      return stillMatches ? current.map((row) => (row.id === updated.id ? updated : row)) : current.filter((row) => row.id !== updated.id);
    });
    loadStats();
    fetchAdminSuppliers().then(setSuppliers).catch(() => undefined);
  }

  async function confirmHide() {
    if (!hiding) return;
    const text = reason.trim();
    if (!text) {
      setError("Indiquez le motif communiqué au fournisseur.");
      return;
    }
    setBusy(hiding.id);
    setError(null);
    try {
      const updated = await hideProduct(hiding.id, text);
      replaceRow(updated);
      setDetail((current) => (current && current.id === updated.id ? updated : current));
      setHiding(null);
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function restore(row: AdminProductRow) {
    setBusy(row.id);
    setError(null);
    try {
      const updated = await unhideProduct(row.id);
      replaceRow(updated);
      setDetail((current) => (current && current.id === updated.id ? updated : current));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  function openDetail(row: AdminProductRow, trigger: HTMLElement | null) {
    opener.current = trigger;
    setError(null);
    setDetail(row);
  }

  function closeDetail() {
    setDetail(null);
    setError(null);
    window.setTimeout(() => opener.current?.focus(), 0);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = status !== "ALL" || categoryId !== "" || supplierId !== "" || query.trim() !== "";
  const categoryOptions = [{ value: "", label: "Toutes les catégories" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  const supplierOptions = [
    { value: "", label: "Tous les fournisseurs" },
    ...(suppliers ?? []).map((supplier) => ({ value: supplier.id, label: supplier.displayName })),
  ];
  const statusCount: Record<AdminProductStatus, number | null> = {
    ALL: stats ? stats.products : null,
    VISIBLE: stats ? stats.visible : null,
    HIDDEN: stats ? stats.hidden : null,
    INACTIVE: stats ? stats.inactive : null,
  };

  function resetFilters() {
    setQuery("");
    setStatus("ALL");
    setCategoryId("");
    setSupplierId("");
  }

  const kpiCards: { key: string; label: string; icon: ReactNode; tone: string; value: string; hint: string; onClick?: () => void }[] = [
    {
      key: "visible",
      label: "Articles en ligne",
      icon: <Package size={22} aria-hidden="true" />,
      tone: "blue",
      value: stats ? compactNumber(stats.visible) : "—",
      hint: stats ? `${stats.products} au total · ${stats.inactive} brouillons` : " ",
    },
    {
      key: "hidden",
      label: "Masqués par la modération",
      icon: <ShieldAlert size={22} aria-hidden="true" />,
      tone: "orange",
      value: stats ? String(stats.hidden) : "—",
      hint: "Visibles uniquement par leur fournisseur",
      onClick: () => {
        setTab("products");
        setStatus("HIDDEN");
      },
    },
    {
      key: "suppliers",
      label: "Fournisseurs actifs",
      icon: <Store size={22} aria-hidden="true" />,
      tone: "blue",
      value: stats ? String(stats.activeSuppliers) : "—",
      hint: stats ? `${stats.suppliers} comptes fournisseur` : " ",
      onClick: () => setTab("suppliers"),
    },
    {
      key: "conversations",
      label: "Conversations acheteurs",
      icon: <MessagesSquare size={22} aria-hidden="true" />,
      tone: "violet",
      value: stats ? compactNumber(stats.conversations) : "—",
      hint: stats ? `+${stats.newConversations7d} sur 7 jours` : " ",
    },
  ];

  return (
    <section className="bo-dash bo-users bo-mx">
      <header className="bo-dash-head">
        <div>
          <h1>Marketplace</h1>
          <p>
            Les fournisseurs publient librement leurs articles de sport. Surveillez le catalogue et masquez les annonces
            non conformes : le fournisseur est notifié avec le motif.
          </p>
        </div>
        <div className="mx-head-actions">
          <Link className="bo-users-btn" to="/admin/config/categories">
            <Layers size={16} aria-hidden="true" />
            Catégories
          </Link>
          <a className="bo-users-btn" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Voir la vitrine
          </a>
        </div>
      </header>

      <div className="bo-dash-kpis">
        {kpiCards.map((card) => {
          const body = (
            <>
              <span className={`bo-dash-icon is-${card.tone}`}>{card.icon}</span>
              <span className="bo-dash-kpi-label">{card.label}</span>
              <span className="bo-dash-kpi-value">{card.value}</span>
              <span className="bo-dash-kpi-meta">
                <small>{card.hint}</small>
              </span>
            </>
          );
          return card.onClick ? (
            <button key={card.key} type="button" className="bo-dash-kpi mx-kpi" onClick={card.onClick}>
              {body}
            </button>
          ) : (
            <div key={card.key} className="bo-dash-kpi">
              {body}
            </div>
          );
        })}
      </div>

      <div className="bo-users-tabs mx-sections" role="tablist" aria-label="Sections du marketplace">
        <button type="button" role="tab" aria-selected={tab === "products"} className={tab === "products" ? "is-active" : ""} onClick={() => setTab("products")}>
          <Package size={16} aria-hidden="true" />
          Articles
          {stats ? <span>{stats.products}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={tab === "suppliers"} className={tab === "suppliers" ? "is-active" : ""} onClick={() => setTab("suppliers")}>
          <Users size={16} aria-hidden="true" />
          Fournisseurs
          {suppliers ? <span>{suppliers.length}</span> : null}
        </button>
      </div>

      {error && !hiding ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      {tab === "products" ? (
        <div className="bo-dash-card bo-users-card">
          <div className="bo-users-toolbar">
            <div className="bo-users-tabs" role="tablist" aria-label="Filtrer les articles par statut">
              {STATUS_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={status === item.id}
                  className={status === item.id ? "is-active" : ""}
                  onClick={() => setStatus(item.id)}
                >
                  {item.label}
                  {statusCount[item.id] !== null ? <span>{statusCount[item.id]}</span> : null}
                </button>
              ))}
            </div>
            <label className="bo-users-search">
              <Search size={16} aria-hidden="true" />
              <input value={query} placeholder="Article, marque…" aria-label="Rechercher un article" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div className="bo-users-filters">
              <DashSelect label="Catégorie" value={categoryId} options={categoryOptions} onChange={setCategoryId} align="left" />
              <DashSelect label="Fournisseur" value={supplierId} options={supplierOptions} onChange={setSupplierId} align="left" />
              {filtersActive ? (
                <button type="button" className="bo-users-reset" onClick={resetFilters} title="Réinitialiser les filtres" aria-label="Réinitialiser les filtres">
                  <RotateCcw size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="bo-users-table-wrap">
            <table className="bo-users-table mx-table">
              <caption className="mx-sr">Articles du marketplace</caption>
              <thead>
                <tr>
                  <th scope="col">Article</th>
                  <th scope="col">Fournisseur</th>
                  <th scope="col">Catégorie</th>
                  <th scope="col" className="mx-num">
                    Prix
                  </th>
                  <th scope="col" className="mx-num">
                    Vues
                  </th>
                  <th scope="col" className="mx-num">
                    Contacts
                  </th>
                  <th scope="col">Statut</th>
                  <th scope="col">Publié</th>
                  <th scope="col" className="mx-actions">
                    <span className="mx-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows === null ? (
                  [0, 1, 2, 3, 4].map((key) => (
                    <tr key={key} className="is-skeleton" aria-hidden="true">
                      <td colSpan={9}>
                        <div className="bo-skeleton bo-users-skel" />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="bo-users-empty">
                        <span>
                          <Package size={22} aria-hidden="true" />
                        </span>
                        <strong>Aucun article</strong>
                        <p>{filtersActive ? "Aucun article ne correspond à ces filtres." : "Aucun article pour le moment."}</p>
                        {filtersActive ? (
                          <button type="button" className="bo-users-btn" onClick={resetFilters}>
                            <RotateCcw size={15} aria-hidden="true" />
                            Réinitialiser les filtres
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const st = rowStatus(row);
                    const price = formatPrice(row.priceAmount, row.priceCurrency);
                    return (
                      <tr key={row.id}>
                        <td className="mx-product">
                          <button
                            type="button"
                            className="mx-item mx-item-btn"
                            aria-label={`Voir les détails de ${row.name}`}
                            onClick={(event) => openDetail(row, event.currentTarget)}
                          >
                            <Thumb src={row.firstPhotoUploadId ? productPhotoUrl(row.id, row.firstPhotoUploadId) : null} />
                            <span className="mx-item-text">
                              <strong>{row.name}</strong>
                              <small>{[row.brand, conditionLabel(row.condition)].filter(Boolean).join(" · ")}</small>
                            </span>
                          </button>
                        </td>
                        <td className="mx-supplier">
                          <div className="mx-two">
                            <strong>{row.supplierName}</strong>
                            <small>{row.supplierEmail}</small>
                          </div>
                        </td>
                        <td className="mx-category">{row.categoryName}</td>
                        <td className="mx-num mx-price">{price ?? <span className="mx-muted">Sur demande</span>}</td>
                        <td className="mx-num mx-views">{compactNumber(row.viewCount)}</td>
                        <td className="mx-num mx-contacts">{row.conversationCount}</td>
                        <td className="mx-state">
                          <span className={`bo-users-status ${st.tone}`}>{st.label}</span>
                          {row.hiddenByAdmin && row.hiddenReason ? (
                            <small className="mx-reason-note" title={row.hiddenReason}>
                              {row.hiddenReason}
                            </small>
                          ) : null}
                        </td>
                        <td className="mx-date" title={shortDate(row.createdAt)}>
                          {timeAgo(row.createdAt)}
                        </td>
                        <td className="mx-actions">
                          <div className="bo-users-actions">
                            <button
                              type="button"
                              className="bo-users-icon"
                              title="Voir les détails"
                              aria-label={`Voir les détails de ${row.name}`}
                              onClick={(event) => openDetail(row, event.currentTarget)}
                            >
                              <Info size={16} aria-hidden="true" />
                            </button>
                            {row.active && !row.hiddenByAdmin ? (
                              <a
                                className="bo-users-icon"
                                href={`/marketplace/products/${row.id}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Voir l’annonce"
                                aria-label={`Voir l’annonce ${row.name}`}
                              >
                                <Eye size={16} aria-hidden="true" />
                              </a>
                            ) : null}
                            {row.hiddenByAdmin ? (
                              <button
                                type="button"
                                className="bo-users-icon"
                                title="Rétablir l’article"
                                aria-label={`Rétablir ${row.name}`}
                                disabled={busy === row.id}
                                onClick={() => void restore(row)}
                              >
                                <RotateCcw size={16} aria-hidden="true" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="bo-users-icon is-danger"
                                title="Masquer l’article"
                                aria-label={`Masquer ${row.name}`}
                                disabled={busy === row.id}
                                onClick={() => {
                                  setError(null);
                                  setReason("");
                                  setHiding(row);
                                }}
                              >
                                <EyeOff size={16} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="bo-users-pager">
            <span>
              {rows === null ? "Chargement…" : `${total} article${total > 1 ? "s" : ""} · page ${page + 1} / ${pages}`}
            </span>
            <nav className="bo-users-pages" aria-label="Pagination">
              <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} aria-label="Page précédente">
                <ChevronLeft size={16} />
              </button>
              {pagesToShow(page, pages).map((entry, index) =>
                entry === "gap" ? (
                  <span key={`gap-${index}`} className="bo-users-gap" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    className={entry === page ? "is-current" : ""}
                    aria-current={entry === page ? "page" : undefined}
                    aria-label={`Page ${entry + 1}`}
                    onClick={() => setPage(entry)}
                  >
                    {entry + 1}
                  </button>
                ),
              )}
              <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)} aria-label="Page suivante">
                <ChevronRight size={16} />
              </button>
            </nav>
          </footer>
        </div>
      ) : (
        <div className="bo-dash-card bo-users-card">
          <div className="bo-users-table-wrap">
            <table className="bo-users-table mx-table is-suppliers">
              <caption className="mx-sr">Fournisseurs du marketplace</caption>
              <thead>
                <tr>
                  <th scope="col">Fournisseur</th>
                  <th scope="col">Ville</th>
                  <th scope="col" className="mx-num">
                    Articles
                  </th>
                  <th scope="col" className="mx-num">
                    En ligne
                  </th>
                  <th scope="col" className="mx-num">
                    Masqués
                  </th>
                  <th scope="col" className="mx-num">
                    Conversations
                  </th>
                  <th scope="col">Compte</th>
                  <th scope="col">Inscrit</th>
                  <th scope="col" className="mx-actions">
                    <span className="mx-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppliers === null ? (
                  [0, 1, 2].map((key) => (
                    <tr key={key} className="is-skeleton" aria-hidden="true">
                      <td colSpan={9}>
                        <div className="bo-skeleton bo-users-skel" />
                      </td>
                    </tr>
                  ))
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="bo-users-empty">
                        <span>
                          <Store size={22} aria-hidden="true" />
                        </span>
                        <strong>Aucun fournisseur</strong>
                        <p>Les comptes avec le rôle « Fournisseur » apparaîtront ici.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="mx-product">
                        <div className="mx-item">
                          <span className="mx-initial" aria-hidden="true">
                            {supplier.displayName.slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <strong>{supplier.displayName}</strong>
                            <small>{supplier.email}</small>
                          </div>
                        </div>
                      </td>
                      <td className="mx-category">{supplier.city ?? "—"}</td>
                      <td className="mx-num mx-price">{supplier.productCount}</td>
                      <td className="mx-num mx-views">{supplier.visibleCount}</td>
                      <td className="mx-num mx-contacts">
                        {supplier.hiddenCount > 0 ? <span className="bo-users-status is-danger">{supplier.hiddenCount}</span> : 0}
                      </td>
                      <td className="mx-num mx-convs">{supplier.conversationCount}</td>
                      <td className="mx-state">
                        <span className={`bo-users-status ${supplier.enabled ? "is-success" : "is-neutral"}`}>{supplier.enabled ? "Actif" : "Désactivé"}</span>
                      </td>
                      <td className="mx-date">{shortDate(supplier.createdAt)}</td>
                      <td className="mx-actions">
                        <div className="bo-users-actions">
                          <button
                            type="button"
                            className="bo-users-btn"
                            disabled={supplier.productCount === 0}
                            onClick={() => {
                              setSupplierId(supplier.id);
                              setStatus("ALL");
                              setTab("products");
                            }}
                          >
                            <Package size={15} aria-hidden="true" />
                            Articles
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <footer className="bo-users-pager">
            <span>{suppliers === null ? "Chargement…" : `${suppliers.length} fournisseur${suppliers.length > 1 ? "s" : ""}`}</span>
          </footer>
        </div>
      )}

      {detail ? (
        <ProductDrawer
          product={detail}
          city={(suppliers ?? []).find((item) => item.id === detail.supplierId)?.city ?? null}
          busy={busy === detail.id}
          error={error && !hiding ? error : null}
          onHide={() => {
            setError(null);
            setReason("");
            setHiding(detail);
          }}
          onRestore={() => void restore(detail)}
          onClose={closeDetail}
        />
      ) : null}

      {hiding ? (
        <UsersModal
          title="Masquer cet article"
          subtitle={`${hiding.name} — ${hiding.supplierName}`}
          onClose={() => setHiding(null)}
          locked={busy === hiding.id}
          footer={
            <>
              <button type="button" className="um-btn" disabled={busy === hiding.id} onClick={() => setHiding(null)}>
                Annuler
              </button>
              <button type="button" className="um-btn is-danger" disabled={busy === hiding.id} onClick={() => void confirmHide()}>
                <EyeOff size={15} aria-hidden="true" />
                {busy === hiding.id ? "Masquage…" : "Masquer l’article"}
              </button>
            </>
          }
        >
          <p className="mx-modal-lead">
            L’annonce disparaît immédiatement du catalogue public. Le fournisseur reçoit une notification avec ce motif et
            peut corriger son article.
          </p>
          {error ? (
            <p className="um-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mx-reasons" role="group" aria-label="Motifs rapides">
            {QUICK_REASONS.map((item) => (
              <button key={item} type="button" aria-pressed={reason === item} className={reason === item ? "is-active" : ""} onClick={() => setReason(item)}>
                {item}
              </button>
            ))}
          </div>
          <label className="mx-field">
            <span>Motif communiqué au fournisseur</span>
            <textarea
              value={reason}
              maxLength={500}
              data-autofocus
              placeholder="Expliquez ce qui doit être corrigé…"
              onChange={(event) => setReason(event.target.value)}
            />
            <small>{reason.length}/500</small>
          </label>
        </UsersModal>
      ) : null}
    </section>
  );
}

function pagesToShow(current: number, count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const pages = new Set([0, count - 1, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 0 && page < count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push("gap");
    out.push(page);
  });
  return out;
}

function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="mx-thumb" aria-hidden="true">
      {src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <ImageIcon size={18} />}
    </span>
  );
}

function ProductDrawer({
  product,
  city,
  busy,
  error,
  onHide,
  onRestore,
  onClose,
}: {
  product: AdminProductRow;
  city: string | null;
  busy: boolean;
  error: string | null;
  onHide: () => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const st = rowStatus(product);
  const price = formatPrice(product.priceAmount, product.priceCurrency);
  const publicNow = product.active && !product.hiddenByAdmin;
  const photo = product.firstPhotoUploadId ? productPhotoUrl(product.id, product.firstPhotoUploadId) : null;
  return (
    <BoDrawer
      premium
      className="mx-drawer"
      title="Détails de l’article"
      width={500}
      onClose={onClose}
      headerContent={
        <div className="mx-drawer-head">
          <span className="vx-eyebrow">Marketplace</span>
          <h2>Détails de l’article</h2>
        </div>
      }
      footer={
        <>
          {publicNow ? (
            <a className="um-btn" href={`/marketplace/products/${product.id}`} target="_blank" rel="noreferrer">
              <ExternalLink size={15} aria-hidden="true" />
              Voir sur la vitrine
            </a>
          ) : null}
          {product.hiddenByAdmin ? (
            <button type="button" className="um-btn is-primary" disabled={busy} onClick={onRestore}>
              <RotateCcw size={15} aria-hidden="true" />
              {busy ? "Rétablissement…" : "Rétablir l’article"}
            </button>
          ) : (
            <button type="button" className="um-btn is-soft-danger" disabled={busy} onClick={onHide}>
              <EyeOff size={15} aria-hidden="true" />
              Masquer l’article
            </button>
          )}
        </>
      }
    >
      {error ? (
        <p className="vx-note is-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mx-sheet">
        <div className={photo && !failed ? "mx-photo" : "mx-photo is-empty"}>
          {photo && !failed ? (
            <img src={photo} alt={`Photo de ${product.name}`} onError={() => setFailed(true)} />
          ) : (
            <span className="mx-photo-empty">
              <ImageOff size={20} aria-hidden="true" />
              Aucune photo disponible
            </span>
          )}
        </div>

        <section className="mx-summary">
          <div className="mx-summary-top">
            <span className={`bo-users-status ${st.tone}`}>{st.label}</span>
            <span className="mx-summary-date" title={shortDate(product.createdAt)}>
              Publié {timeAgo(product.createdAt)}
            </span>
          </div>
          <h3>{product.name}</h3>
          <p>{[product.brand, conditionLabel(product.condition)].filter(Boolean).join(" · ")}</p>
          <strong className="mx-summary-price">{price ?? "Sur demande"}</strong>
        </section>

        <section className="mx-block">
          <h4>Informations produit</h4>
          <dl className="mx-rows">
            <div>
              <dt>Catégorie</dt>
              <dd>{product.categoryName}</dd>
            </div>
            <div>
              <dt>Marque</dt>
              <dd>{product.brand || "—"}</dd>
            </div>
            <div>
              <dt>État</dt>
              <dd>{conditionLabel(product.condition)}</dd>
            </div>
          </dl>
          <p className="mx-hint">La description complète et les photos supplémentaires ne sont pas exposées à l’administration.</p>
        </section>

        <section className="mx-block">
          <h4>Fournisseur</h4>
          <div className="mx-supplier-card">
            <span className="mx-initial" aria-hidden="true">
              {product.supplierName.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{product.supplierName}</strong>
              {product.supplierEmail ? (
                <span>
                  <Mail size={13} aria-hidden="true" />
                  {product.supplierEmail}
                </span>
              ) : null}
              {city ? (
                <span>
                  <MapPin size={13} aria-hidden="true" />
                  {city}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-block">
          <h4>Statistiques</h4>
          <dl className="mx-rows">
            <div>
              <dt>Vues</dt>
              <dd>{compactNumber(product.viewCount)}</dd>
            </div>
            <div>
              <dt>Contacts</dt>
              <dd>{product.conversationCount}</dd>
            </div>
            <div>
              <dt>Publié le</dt>
              <dd>{shortDate(product.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="mx-block">
          <h4>Modération</h4>
          <dl className="mx-rows">
            <div>
              <dt>Statut actuel</dt>
              <dd>{st.label}</dd>
            </div>
            {product.hiddenByAdmin && product.hiddenAt ? (
              <div>
                <dt>Masqué le</dt>
                <dd>{shortDate(product.hiddenAt)}</dd>
              </div>
            ) : null}
          </dl>
          {product.hiddenByAdmin && product.hiddenReason ? (
            <p className="vx-note is-error">
              <span>
                <strong>Motif :</strong> {product.hiddenReason}
              </span>
            </p>
          ) : (
            <p className="mx-hint">{publicNow ? "Cet article est visible sur le catalogue public." : "Cet article n’est pas visible publiquement."}</p>
          )}
        </section>
      </div>
    </BoDrawer>
  );
}
