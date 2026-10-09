import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  Handshake,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessagesSquare,
  Pencil,
  PlayCircle,
  Send,
  Store,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import {
  conditionLabel,
  contactSupplier,
  fetchProductConversation,
  fetchProductDetail,
  formatPrice,
  productPhotoUrl,
  type ProductDetail,
} from "../api";
import { compactNumber } from "../format";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setDetail(null);
    setPhoto(0);
    fetchProductDetail(id)
      .then((result) => {
        setDetail(result);
        setMessage(`Bonjour, votre article « ${result.product.name} » m’intéresse. Est-il toujours disponible ?`);
      })
      .catch(() => setError("Cet article n’existe pas ou n’est plus disponible."));
    fetchProductConversation(id)
      .then((ref) => setConversationId(ref.conversationId))
      .catch(() => setConversationId(null));
  }, [id]);

  async function send() {
    if (!id || !message.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const conversation = await contactSupplier(id, message.trim());
      navigate(`/app/marketplace/messages?c=${conversation.id}`);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Message non envoyé. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <section className="pd-wrap">
        <div className="bo-empty">
          <div className="bo-empty-icon">
            <Store size={22} />
          </div>
          <div className="bo-empty-title">{error}</div>
          <Link className="bo-btn" to="/marketplace/products">
            <ArrowLeft size={16} />
            Retour au catalogue
          </Link>
        </div>
      </section>
    );
  }

  if (!detail || !id) {
    return (
      <section className="pd-wrap">
        <div className="pd-grid">
          <div className="bo-skeleton" style={{ aspectRatio: "4 / 3" }} />
          <div className="bo-skeleton" style={{ height: 420 }} />
        </div>
      </section>
    );
  }

  const { product, supplier } = detail;
  const price = formatPrice(product.priceAmount, product.priceCurrency);
  const isOwner = Boolean(user && supplier && user.id === supplier.id);
  const photos = product.photoUploadIds;

  return (
    <section className="pd-wrap">
      <nav className="pd-crumbs">
        <Link to="/marketplace/products">
          <ArrowLeft size={15} />
          Marketplace
        </Link>
        <span>/</span>
        <Link to={`/marketplace/products?categoryId=${product.categoryId}`}>{product.categoryName}</Link>
      </nav>

      <div className="pd-grid">
        <div className="pd-gallery">
          <div className="pd-stage">
            {photos.length ? (
              <img src={productPhotoUrl(product.id, photos[photo])} alt={product.name} />
            ) : (
              <ImageIcon size={48} />
            )}
          </div>
          {photos.length > 1 ? (
            <div className="pd-thumbs">
              {photos.map((uploadId, index) => (
                <button
                  key={uploadId}
                  type="button"
                  className={index === photo ? "is-active" : ""}
                  onClick={() => setPhoto(index)}
                  aria-label={`Photo ${index + 1}`}
                >
                  <img src={productPhotoUrl(product.id, uploadId)} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="pd-side">
          <div className="pd-card">
            <div className="pd-tags">
              <span className="bo-pill is-info no-dot">{product.categoryName}</span>
              <span className={`bo-pill no-dot ${product.condition === "NEW" ? "is-success" : "is-violet"}`}>
                {conditionLabel(product.condition)}
              </span>
            </div>
            <h1 className="pd-title">{product.name}</h1>
            {product.brand ? <p className="pd-brand">{product.brand}</p> : null}
            <div className="pd-price">
              {price ?? <span className="pd-price-muted">Prix sur demande</span>}
            </div>
            <div className="pd-views">
              <Eye size={14} />
              {compactNumber(product.viewCount)} vue{product.viewCount > 1 ? "s" : ""}
            </div>

            <div className="pd-supplier">
              <span className="pd-supplier-mark">{(supplier?.displayName ?? "F").slice(0, 1).toUpperCase()}</span>
              <div>
                <div className="pd-supplier-name">
                  {supplier?.displayName ?? "Fournisseur"}
                  <BadgeCheck size={15} color="var(--bo-primary)" />
                </div>
                <div className="pd-supplier-sub">
                  {supplier?.city ? (
                    <>
                      <MapPin size={12} style={{ verticalAlign: "-1px" }} /> {supplier.city}
                    </>
                  ) : (
                    "Fournisseur"
                  )}
                </div>
              </div>
            </div>

            {isOwner ? (
              <div className="pd-contact">
                <div className="bo-alert">
                  <Store size={18} />
                  <div>C’est votre article. Les acheteurs qui vous écrivent apparaissent dans vos messages.</div>
                </div>
                <Link className="bo-btn bo-btn--primary bo-btn--block" to="/app/marketplace/mine">
                  <Pencil size={16} />
                  Gérer mes articles
                </Link>
              </div>
            ) : conversationId ? (
              <div className="pd-contact">
                <p className="pd-contact-lead">Vous êtes déjà en contact avec ce fournisseur.</p>
                <Link className="bo-btn bo-btn--primary bo-btn--block" to={`/app/marketplace/messages?c=${conversationId}`}>
                  <MessagesSquare size={16} />
                  Ouvrir la conversation
                </Link>
              </div>
            ) : (
              <div className="pd-contact">
                <label className="bo-field" style={{ marginBottom: 10 }}>
                  <span className="bo-field-label">Contacter le fournisseur</span>
                  <textarea
                    className="bo-textarea"
                    value={message}
                    maxLength={4000}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
                {sendError ? <p className="bo-error">{sendError}</p> : null}
                <button
                  type="button"
                  className="bo-btn bo-btn--primary bo-btn--block"
                  disabled={sending || !message.trim()}
                  onClick={() => void send()}
                >
                  {sending ? <Loader2 size={16} className="bo-spin" /> : <Send size={16} />}
                  Envoyer le message
                </button>
              </div>
            )}

            <div className="pd-note">
              <Handshake size={16} />
              <span>
                Pas de paiement en ligne : vous convenez du prix, de la remise ou de la livraison directement avec le
                fournisseur.
              </span>
            </div>
          </div>
        </aside>
      </div>

      <div className="pd-sections">
        {product.description ? (
          <div className="pd-section">
            <h2>Description</h2>
            <p>{product.description}</p>
          </div>
        ) : null}
        {product.technicalSheet ? (
          <div className="pd-section">
            <h2>Fiche technique</h2>
            <p>{product.technicalSheet}</p>
          </div>
        ) : null}
        {product.videos.length ? (
          <div className="pd-section">
            <h2>Vidéos</h2>
            <div className="pd-videos">
              {product.videos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer">
                  <PlayCircle size={18} />
                  <span>{url}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
