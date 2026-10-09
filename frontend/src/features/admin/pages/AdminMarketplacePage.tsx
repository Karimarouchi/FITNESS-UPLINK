import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  MessagesSquare,
  Package,
  RotateCcw,
  Search,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import { BoModal } from "@/components/ui/BoOverlay";
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
      replaceRow(await hideProduct(hiding.id, text));
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
      replaceRow(await unhideProduct(row.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="bo-page">
      <div className="bo-head">
        <div>
          <h1>Marketplace</h1>
          <p>
            Les fournisseurs publient librement leurs articles de sport. Surveillez le catalogue et masquez les annonces
            non conformes : le fournisseur est notifié avec le motif.
          </p>
        </div>
        <div className="bo-head-actions">
          <Link className="bo-btn" to="/admin/config/categories">
            <Layers size={16} />
            Catégories
          </Link>
          <a className="bo-btn" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Voir la vitrine
          </a>
        </div>
      </div>

      <div className="bo-kpis">
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Articles en ligne</span>
            <span className="bo-kpi-icon is-green">
              <Package size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? compactNumber(stats.visible) : "—"}</div>
          <div className="bo-kpi-hint">{stats ? `${stats.products} au total · ${stats.inactive} brouillons` : " "}</div>
        </div>
        <button type="button" className="bo-kpi" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => { setTab("products"); setStatus("HIDDEN"); }}>
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Masqués par la modération</span>
            <span className="bo-kpi-icon is-rose">
              <ShieldAlert size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? stats.hidden : "—"}</div>
          <div className="bo-kpi-hint">Visibles uniquement par leur fournisseur</div>
        </button>
        <button type="button" className="bo-kpi" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setTab("suppliers")}>
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Fournisseurs actifs</span>
            <span className="bo-kpi-icon">
              <Store size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? stats.activeSuppliers : "—"}</div>
          <div className="bo-kpi-hint">{stats ? `${stats.suppliers} comptes fournisseur` : " "}</div>
        </button>
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Conversations acheteurs</span>
            <span className="bo-kpi-icon is-violet">
              <MessagesSquare size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? compactNumber(stats.conversations) : "—"}</div>
          <div className="bo-kpi-hint">{stats ? `+${stats.newConversations7d} sur 7 jours` : " "}</div>
        </div>
      </div>

      <div className="bo-tabs" role="tablist">
        <button type="button" role="tab" className={tab === "products" ? "is-active" : ""} onClick={() => setTab("products")}>
          <Package size={16} />
          Articles
        </button>
        <button type="button" role="tab" className={tab === "suppliers" ? "is-active" : ""} onClick={() => setTab("suppliers")}>
          <Users size={16} />
          Fournisseurs
        </button>
      </div>

      {error && !hiding ? <p className="bo-error">{error}</p> : null}

      {tab === "products" ? (
        <div className="bo-card">
          <div className="bo-toolbar">
            <div className="bo-seg">
              {STATUS_TABS.map((item) => (
                <button key={item.id} type="button" className={status === item.id ? "is-active" : ""} onClick={() => setStatus(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="bo-toolbar-search">
              <Search size={16} />
              <input className="bo-input" value={query} placeholder="Article, marque…" onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="bo-toolbar-spacer" />
            <select className="bo-select" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Catégorie">
              <option value="">Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="bo-select" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} aria-label="Fournisseur">
              <option value="">Tous les fournisseurs</option>
              {(suppliers ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Fournisseur</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th className="is-num">Vues</th>
                  <th className="is-num">Contacts</th>
                  <th>Statut</th>
                  <th>Publié</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows === null ? (
                  [0, 1, 2, 3, 4].map((key) => (
                    <tr key={key}>
                      <td colSpan={9}>
                        <div className="bo-skeleton" style={{ height: 40 }} />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="bo-empty">
                        <div className="bo-empty-icon">
                          <Package size={22} />
                        </div>
                        <div className="bo-empty-title">Aucun article</div>
                        <p>Aucun article ne correspond à ces filtres.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const st = rowStatus(row);
                    const price = formatPrice(row.priceAmount, row.priceCurrency);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="bo-cell-main">
                            <span className="bo-thumb">
                              {row.firstPhotoUploadId ? (
                                <img src={productPhotoUrl(row.id, row.firstPhotoUploadId)} alt="" loading="lazy" />
                              ) : (
                                <ImageIcon size={18} />
                              )}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div className="bo-cell-title">{row.name}</div>
                              <div className="bo-cell-sub">
                                {[row.brand, conditionLabel(row.condition)].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="bo-cell-title" style={{ fontWeight: 500 }}>
                            {row.supplierName}
                          </div>
                          <div className="bo-cell-sub">{row.supplierEmail}</div>
                        </td>
                        <td>{row.categoryName}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{price ?? <span style={{ color: "var(--bo-muted)" }}>Sur demande</span>}</td>
                        <td className="is-num">{compactNumber(row.viewCount)}</td>
                        <td className="is-num">{row.conversationCount}</td>
                        <td>
                          <span className={`bo-pill ${st.tone}`}>{st.label}</span>
                          {row.hiddenByAdmin && row.hiddenReason ? (
                            <div className="bo-cell-sub" style={{ maxWidth: 220 }} title={row.hiddenReason}>
                              {row.hiddenReason}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }} title={shortDate(row.createdAt)}>
                          {timeAgo(row.createdAt)}
                        </td>
                        <td>
                          <div className="bo-row-actions">
                            {row.active && !row.hiddenByAdmin ? (
                              <a
                                className="bo-btn bo-btn--sm bo-btn--icon"
                                href={`/marketplace/products/${row.id}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Voir l’annonce"
                                aria-label="Voir l’annonce"
                              >
                                <Eye size={15} />
                              </a>
                            ) : null}
                            {row.hiddenByAdmin ? (
                              <button type="button" className="bo-btn bo-btn--sm" disabled={busy === row.id} onClick={() => void restore(row)}>
                                <RotateCcw size={14} />
                                Rétablir
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="bo-btn bo-btn--sm bo-btn--danger"
                                disabled={busy === row.id}
                                onClick={() => {
                                  setError(null);
                                  setReason("");
                                  setHiding(row);
                                }}
                              >
                                <EyeOff size={14} />
                                Masquer
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
          <div className="bo-pagination">
            <span>
              {total} article{total > 1 ? "s" : ""} · page {page + 1} / {pages}
            </span>
            <div>
              <button type="button" className="bo-btn bo-btn--sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft size={14} />
                Précédent
              </button>
              <button type="button" className="bo-btn bo-btn--sm" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>
                Suivant
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bo-card">
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Ville</th>
                  <th className="is-num">Articles</th>
                  <th className="is-num">En ligne</th>
                  <th className="is-num">Masqués</th>
                  <th className="is-num">Conversations</th>
                  <th>Compte</th>
                  <th>Inscrit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {suppliers === null ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="bo-skeleton" style={{ height: 40 }} />
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="bo-empty">
                        <div className="bo-empty-icon">
                          <Store size={22} />
                        </div>
                        <div className="bo-empty-title">Aucun fournisseur</div>
                        <p>Les comptes avec le rôle « Fournisseur » apparaîtront ici.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <div className="bo-cell-main">
                          <span className="bo-thumb is-sm" style={{ background: "var(--bo-primary-soft)", color: "var(--bo-primary)", fontWeight: 700 }}>
                            {supplier.displayName.slice(0, 1).toUpperCase()}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="bo-cell-title">{supplier.displayName}</div>
                            <div className="bo-cell-sub">{supplier.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{supplier.city ?? "—"}</td>
                      <td className="is-num">{supplier.productCount}</td>
                      <td className="is-num">{supplier.visibleCount}</td>
                      <td className="is-num">
                        {supplier.hiddenCount > 0 ? <span className="bo-pill is-danger no-dot">{supplier.hiddenCount}</span> : 0}
                      </td>
                      <td className="is-num">{supplier.conversationCount}</td>
                      <td>
                        <span className={`bo-pill ${supplier.enabled ? "is-success" : ""}`}>{supplier.enabled ? "Actif" : "Désactivé"}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{shortDate(supplier.createdAt)}</td>
                      <td>
                        <div className="bo-row-actions">
                          <button
                            type="button"
                            className="bo-btn bo-btn--sm"
                            disabled={supplier.productCount === 0}
                            onClick={() => {
                              setSupplierId(supplier.id);
                              setStatus("ALL");
                              setTab("products");
                            }}
                          >
                            <Package size={14} />
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
        </div>
      )}

      {hiding ? (
        <BoModal
          title="Masquer cet article"
          subtitle={`${hiding.name} — ${hiding.supplierName}`}
          onClose={() => setHiding(null)}
          footer={
            <>
              <button type="button" className="bo-btn" onClick={() => setHiding(null)}>
                Annuler
              </button>
              <button type="button" className="bo-btn bo-btn--danger-solid" disabled={busy === hiding.id} onClick={() => void confirmHide()}>
                <EyeOff size={15} />
                Masquer l’article
              </button>
            </>
          }
        >
          <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--bo-text-2)" }}>
            L’annonce disparaît immédiatement du catalogue public. Le fournisseur reçoit une notification avec ce motif et
            peut corriger son article.
          </p>
          {error ? <p className="bo-error">{error}</p> : null}
          <div className="bo-chip-list" style={{ marginBottom: 12 }}>
            {QUICK_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                className={reason === item ? "bo-choice is-active" : "bo-choice"}
                style={{ height: 30, fontSize: 12.5 }}
                onClick={() => setReason(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="bo-field" style={{ marginBottom: 0 }}>
            <span className="bo-field-label">Motif communiqué au fournisseur</span>
            <textarea
              className="bo-textarea"
              value={reason}
              maxLength={500}
              placeholder="Expliquez ce qui doit être corrigé…"
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="bo-field-hint">{reason.length}/500</span>
          </label>
        </BoModal>
      ) : null}
    </section>
  );
}
