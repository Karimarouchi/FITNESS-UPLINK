import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tag } from "@/components/ui/Tag";
import { fetchProductDetail, productPhotoUrl, type ProductDetail } from "../api";
import { GuestQuoteForm } from "../GuestQuoteForm";

const ease = [0.16, 1, 0.3, 1] as const;

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchProductDetail(id).then(setDetail).catch(() => setError("Produit introuvable."));
  }, [id]);

  if (error) {
    return (
      <section style={{ padding: 48 }}>
        <p className="jobs-empty">
          <strong>{error}</strong>
        </p>
      </section>
    );
  }
  if (!detail || !id) {
    return null;
  }

  const { product, supplier } = detail;

  return (
    <section style={{ padding: 48 }}>
      <motion.div className="profile-banner" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <div>
          <div className="pn">{product.name}</div>
          {product.brand ? <div className="pt">{product.brand}</div> : null}
          <div className="ploc">{supplier?.displayName ?? "Fournisseur"}</div>
          <div className="tag-row">
            <Tag>{product.categoryName}</Tag>
          </div>
          <p className="fu-talent-meta" style={{ marginTop: 8 }}>
            {product.priceAmount ? `${product.priceAmount} ${product.priceCurrency}` : "Prix sur devis"}
          </p>
        </div>
      </motion.div>

      {product.photoUploadIds.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Photos</h2>
          </div>
          <div className="video-grid" style={{ padding: "0 22px 20px" }}>
            {product.photoUploadIds.map((uploadId) => (
              <img
                key={uploadId}
                src={productPhotoUrl(product.id, uploadId)}
                alt={product.name}
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {product.videos.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Vidéos</h2>
          </div>
          <div className="video-grid" style={{ padding: "0 22px 20px" }}>
            {product.videos.map((url) => (
              <a key={url} className="video-card" href={url} target="_blank" rel="noreferrer">
                <div className="play">▶</div>
                <div className="cap">{url}</div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {product.description ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Description</h2>
          </div>
          <p style={{ padding: "0 22px 20px", color: "var(--slate)" }}>{product.description}</p>
        </div>
      ) : null}

      {product.technicalSheet ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Fiche technique</h2>
          </div>
          <p style={{ padding: "0 22px 20px", color: "var(--slate)", whiteSpace: "pre-line" }}>{product.technicalSheet}</p>
        </div>
      ) : null}

      <GuestQuoteForm productId={id} productName={product.name} />
    </section>
  );
}
