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
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

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
    <section className="bo-dash bo-users bo-bm bo-sd">
      <header className="bo-dash-head">
        <div>
          <h1>Bonjour {user?.firstName || user?.displayName || ""}</h1>
          <p>
            Gérez votre catalogue d’articles de sport et répondez aux acheteurs. Les échanges et la vente se font
            directement entre vous, via la messagerie.
          </p>
        </div>
        <div className="sd-head-actions">
          <a className="bm-btn is-outline" href="/marketplace/products" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            Voir la vitrine
          </a>
          <Link className="bm-btn" to="/app/marketplace/mine?new=1">
            <PackagePlus size={16} aria-hidden="true" />
            Nouvel article
          </Link>
        </div>
      </header>

      <div className="bo-dash-kpis">
        <Link className="bo-dash-kpi" to="/app/marketplace/mine">
          <span className="bo-dash-icon">
            <Package size={22} />
          </span>
          <span className="bo-dash-kpi-label">Articles publiés</span>
          <span className="bo-dash-kpi-value">{stats ? s.published : "—"}</span>
          <span className="bo-dash-kpi-meta">
            <small>{s.products} au total dans votre catalogue</small>
          </span>
        </Link>
        <div className="bo-dash-kpi">
          <span className="bo-dash-icon is-blue">
            <Eye size={22} />
          </span>
          <span className="bo-dash-kpi-label">Vues des annonces</span>
          <span className="bo-dash-kpi-value">{stats ? compactNumber(s.views) : "—"}</span>
          <span className="bo-dash-kpi-meta">
            <small>Cumul sur tous vos articles</small>
          </span>
        </div>
        <Link className="bo-dash-kpi" to="/app/marketplace/messages">
          <span className="bo-dash-icon is-neutral">
            <MessagesSquare size={22} />
          </span>
          <span className="bo-dash-kpi-label">Conversations</span>
          <span className="bo-dash-kpi-value">{stats ? s.conversations : "—"}</span>
          <span className="bo-dash-kpi-meta">
            <small>
              {s.unreadConversations > 0 ? `${s.unreadConversations} en attente de réponse` : "Tout est à jour"}
            </small>
          </span>
        </Link>
        <Link className="bo-dash-kpi" to="/app/marketplace/mine">
          <span className={s.hidden > 0 ? "bo-dash-icon is-rose" : "bo-dash-icon is-neutral"}>
            {s.hidden > 0 ? <ShieldAlert size={22} /> : <FileEdit size={22} />}
          </span>
          <span className="bo-dash-kpi-label">Brouillons et masqués</span>
          <span className="bo-dash-kpi-value">{stats ? s.drafts + s.hidden : "—"}</span>
          <span className="bo-dash-kpi-meta">
            <small>
              {s.drafts} brouillon{s.drafts > 1 ? "s" : ""} · {s.hidden} masqué{s.hidden > 1 ? "s" : ""}
            </small>
          </span>
        </Link>
      </div>

      <div className="bo-dash-row sd-row">
        <div className="bo-dash-card sd-card">
          <div className="bo-dash-card-head">
            <div>
              <h2>Derniers messages</h2>
              <p>Les acheteurs qui vous ont contacté</p>
            </div>
            <Link className="bo-dash-link" to="/app/marketplace/messages">
              Tout voir <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {conversations.length === 0 ? (
            <div className="bo-users-empty">
              <span>
                <MessagesSquare size={22} aria-hidden="true" />
              </span>
              <strong>Pas encore de message</strong>
              <p>Des photos soignées et une description complète donnent envie aux acheteurs de vous écrire.</p>
            </div>
          ) : (
            <ul className="sd-list">
              {conversations.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link className="sd-item" to={`/app/marketplace/messages?c=${item.id}`}>
                    <span className="sd-thumb">
                      {item.productId && item.productPhotoUploadId ? (
                        <img src={productPhotoUrl(item.productId, item.productPhotoUploadId)} alt="" />
                      ) : (
                        <ImageIcon size={18} aria-hidden="true" />
                      )}
                    </span>
                    <span className="sd-main">
                      <strong>
                        {item.counterpart.displayName}
                        {item.unreadCount > 0 ? <span className="bo-users-role is-blue">Nouveau</span> : null}
                      </strong>
                      <small>
                        {item.productName} — {item.lastMessagePreview}
                      </small>
                    </span>
                    <span className="sd-meta">{timeAgo(item.lastMessageAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sd-side">
          <div className="bo-dash-card sd-card">
            <div className="bo-dash-card-head">
              <div>
                <h2>État du catalogue</h2>
              </div>
            </div>
            <div className="sd-bars">
              {[
                { label: "Publiés", value: s.published, tone: "is-ok" },
                { label: "Brouillons", value: s.drafts, tone: "is-warn" },
                { label: "Masqués par la modération", value: s.hidden, tone: "is-danger" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="sd-bar-row">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="sd-bar" role="presentation">
                    <span className={row.tone} style={{ width: `${pct(row.value, s.products)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bo-dash-card sd-card">
            <div className="bo-dash-card-head">
              <div>
                <h2>Articles les plus vus</h2>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p className="sd-none">Publiez un premier article pour suivre ses performances.</p>
            ) : (
              <ul className="sd-list">
                {topProducts.map((product) => {
                  const status = productStatus(product);
                  return (
                    <li key={product.id} className="sd-item">
                      <span className="sd-thumb">
                        {product.photoUploadIds[0] ? (
                          <img src={productPhotoUrl(product.id, product.photoUploadIds[0])} alt="" />
                        ) : (
                          <ImageIcon size={18} aria-hidden="true" />
                        )}
                      </span>
                      <span className="sd-main">
                        <strong>{product.name}</strong>
                        <small>
                          <span className={`bo-users-status ${status.tone}`}>{status.label}</span>
                        </small>
                      </span>
                      <span className="sd-meta sd-views">
                        <Eye size={14} aria-hidden="true" />
                        {compactNumber(product.viewCount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {withoutPhoto + withoutDescription > 0 ? (
            <p className="bo-dash-note sd-tip" role="note">
              <Sparkles size={18} aria-hidden="true" />
              <span>
                <strong>Améliorez vos annonces.</strong> {withoutPhoto > 0 ? `${withoutPhoto} sans photo` : ""}
                {withoutPhoto > 0 && withoutDescription > 0 ? " · " : ""}
                {withoutDescription > 0 ? `${withoutDescription} sans description` : ""}.{" "}
                <Link to="/app/marketplace/mine">Compléter</Link>
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
