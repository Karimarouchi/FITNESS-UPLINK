import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Eye,
  FileEdit,
  Image as ImageIcon,
  MessagesSquare,
  Package,
  PackagePlus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  fetchConversations,
  fetchMyProducts,
  fetchSupplierStats,
  productPhotoUrl,
  type Conversation,
  type Product,
  type SupplierStats,
} from "../api";
import { compactNumber, productStatus, timeAgo } from "../format";

const EMPTY_STATS: SupplierStats = {
  products: 0,
  published: 0,
  drafts: 0,
  hidden: 0,
  views: 0,
  conversations: 0,
  unreadConversations: 0,
};

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export function SupplierDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchSupplierStats().then(setStats).catch(() => setStats(EMPTY_STATS));
    fetchConversations().then(setConversations).catch(() => setConversations([]));
    fetchMyProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const s = stats ?? EMPTY_STATS;
  const topProducts = [...products].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const withoutPhoto = products.filter((product) => product.photoUploadIds.length === 0).length;
  const withoutDescription = products.filter((product) => !product.description?.trim()).length;

  return (
    <section className="bo-page">
      <div className="bo-welcome">
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1>Bonjour {user?.firstName || user?.displayName || ""}</h1>
          <p>
            Gérez votre catalogue d’articles de sport et répondez aux acheteurs. Les échanges et la vente se font
            directement entre vous, via la messagerie.
          </p>
        </div>
        <div className="bo-welcome-actions">
          <a className="bo-btn" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Voir la vitrine
          </a>
          <Link className="bo-btn bo-btn--primary" to="/app/marketplace/mine?new=1">
            <PackagePlus size={16} />
            Nouvel article
          </Link>
        </div>
      </div>

      <div className="bo-kpis">
        <Link className="bo-kpi" to="/app/marketplace/mine">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Articles publiés</span>
            <span className="bo-kpi-icon">
              <Package size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? s.published : "—"}</div>
          <div className="bo-kpi-hint">{s.products} au total dans votre catalogue</div>
        </Link>
        <div className="bo-kpi">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Vues des annonces</span>
            <span className="bo-kpi-icon is-violet">
              <Eye size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? compactNumber(s.views) : "—"}</div>
          <div className="bo-kpi-hint">Cumul sur tous vos articles</div>
        </div>
        <Link className="bo-kpi" to="/app/marketplace/messages">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Conversations</span>
            <span className="bo-kpi-icon is-green">
              <MessagesSquare size={18} />
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? s.conversations : "—"}</div>
          <div className="bo-kpi-hint">
            {s.unreadConversations > 0 ? `${s.unreadConversations} en attente de réponse` : "Tout est à jour"}
          </div>
        </Link>
        <Link className="bo-kpi" to="/app/marketplace/mine">
          <div className="bo-kpi-top">
            <span className="bo-kpi-label">Brouillons et masqués</span>
            <span className={s.hidden > 0 ? "bo-kpi-icon is-rose" : "bo-kpi-icon is-amber"}>
              {s.hidden > 0 ? <ShieldAlert size={18} /> : <FileEdit size={18} />}
            </span>
          </div>
          <div className="bo-kpi-value">{stats ? s.drafts + s.hidden : "—"}</div>
          <div className="bo-kpi-hint">
            {s.drafts} brouillon{s.drafts > 1 ? "s" : ""} · {s.hidden} masqué{s.hidden > 1 ? "s" : ""}
          </div>
        </Link>
      </div>

      <div className="bo-grid-2">
        <div className="bo-card">
          <div className="bo-card-head">
            <div>
              <h2>Derniers messages</h2>
              <p>Les acheteurs qui vous ont contacté</p>
            </div>
            <Link className="bo-card-link" to="/app/marketplace/messages">
              Tout voir <ArrowRight size={14} />
            </Link>
          </div>
          {conversations.length === 0 ? (
            <div className="bo-empty">
              <div className="bo-empty-icon">
                <MessagesSquare size={22} />
              </div>
              <div className="bo-empty-title">Pas encore de message</div>
              <p>Des photos soignées et une description complète donnent envie aux acheteurs de vous écrire.</p>
            </div>
          ) : (
            <ul className="bo-list">
              {conversations.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link className="bo-list-item" to={`/app/marketplace/messages?c=${item.id}`}>
                    <span className="bo-thumb is-sm">
                      {item.productId && item.productPhotoUploadId ? (
                        <img src={productPhotoUrl(item.productId, item.productPhotoUploadId)} alt="" />
                      ) : (
                        <ImageIcon size={18} />
                      )}
                    </span>
                    <div className="bo-list-main">
                      <div className="bo-list-title">
                        <span>{item.counterpart.displayName}</span>
                        {item.unreadCount > 0 ? <span className="bo-pill is-info">Nouveau</span> : null}
                      </div>
                      <div className="bo-list-sub">
                        {item.productName} — {item.lastMessagePreview}
                      </div>
                    </div>
                    <span className="bo-list-meta">{timeAgo(item.lastMessageAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="bo-card">
            <div className="bo-card-head">
              <h2>État du catalogue</h2>
            </div>
            <div className="bo-card-body bo-stack">
              {[
                { label: "Publiés", value: s.published, color: "#047857" },
                { label: "Brouillons", value: s.drafts, color: "#d97706" },
                { label: "Masqués par la modération", value: s.hidden, color: "#dc2626" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="bo-stat-row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="bo-bar">
                    <span style={{ width: `${pct(row.value, s.products)}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bo-card">
            <div className="bo-card-head">
              <h2>Articles les plus vus</h2>
            </div>
            {topProducts.length === 0 ? (
              <div className="bo-empty" style={{ padding: "28px 20px" }}>
                <p>Publiez un premier article pour suivre ses performances.</p>
              </div>
            ) : (
              <ul className="bo-list">
                {topProducts.map((product) => {
                  const status = productStatus(product);
                  return (
                    <li key={product.id} className="bo-list-item">
                      <span className="bo-thumb is-sm">
                        {product.photoUploadIds[0] ? (
                          <img src={productPhotoUrl(product.id, product.photoUploadIds[0])} alt="" />
                        ) : (
                          <ImageIcon size={18} />
                        )}
                      </span>
                      <div className="bo-list-main">
                        <div className="bo-list-title">
                          <span>{product.name}</span>
                        </div>
                        <div className="bo-list-sub">
                          <span className={`bo-pill ${status.tone}`} style={{ height: 20, fontSize: 11 }}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <span className="bo-list-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Eye size={13} />
                        {compactNumber(product.viewCount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {withoutPhoto + withoutDescription > 0 ? (
            <div className="bo-card">
              <div className="bo-card-body">
                <div className="bo-alert">
                  <Sparkles size={18} />
                  <div>
                    <strong>Améliorez vos annonces.</strong>{" "}
                    {withoutPhoto > 0 ? `${withoutPhoto} sans photo` : ""}
                    {withoutPhoto > 0 && withoutDescription > 0 ? " · " : ""}
                    {withoutDescription > 0 ? `${withoutDescription} sans description` : ""}.{" "}
                    <Link to="/app/marketplace/mine" style={{ fontWeight: 600 }}>
                      Compléter
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
