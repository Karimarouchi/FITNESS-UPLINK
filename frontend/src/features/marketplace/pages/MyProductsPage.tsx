import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import {
  deleteProduct,
  fetchMyProducts,
  fetchProductCategories,
  productPhotoUrl,
  saveProduct,
  uploadProductPhoto,
  type Product,
  type ProductCategory,
} from "../api";

const EMPTY = {
  categoryId: "",
  name: "",
  brand: "",
  description: "",
  technicalSheet: "",
  priceAmount: "",
  priceCurrency: "TND",
  photoUploadIds: [] as string[],
  videos: [] as string[],
  active: true,
};

export function MyProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [videoDraft, setVideoDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchMyProducts().then(setProducts).catch(() => setProducts([]));
    fetchProductCategories().then(setCategories).catch(() => setCategories([]));
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function startEdit(product: Product) {
    setEditing(product.id);
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      brand: product.brand ?? "",
      description: product.description ?? "",
      technicalSheet: product.technicalSheet ?? "",
      priceAmount: product.priceAmount ?? "",
      priceCurrency: product.priceCurrency ?? "TND",
      photoUploadIds: product.photoUploadIds,
      videos: product.videos,
      active: product.active,
    });
    setShowForm(true);
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 8 - form.photoUploadIds.length)) {
        const result = await uploadProductPhoto(file);
        setForm((current) => ({ ...current, photoUploadIds: [...current.photoUploadIds, result.uploadId] }));
      }
    } catch {
      setError("Impossible d’envoyer une photo.");
    } finally {
      setUploading(false);
    }
  }

  function addVideo() {
    const url = videoDraft.trim();
    if (!url) return;
    setForm((current) => ({ ...current, videos: [...current.videos, url] }));
    setVideoDraft("");
  }

  async function submit() {
    setError(null);
    if (!form.categoryId) {
      setError("Choisissez une catégorie.");
      return;
    }
    try {
      await saveProduct(editing, {
        categoryId: form.categoryId,
        name: form.name,
        brand: form.brand || null,
        description: form.description || null,
        technicalSheet: form.technicalSheet || null,
        priceAmount: form.priceAmount || null,
        priceCurrency: form.priceAmount ? form.priceCurrency : null,
        photoUploadIds: form.photoUploadIds,
        videos: form.videos,
        active: form.active,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer ce produit.");
    }
  }

  async function remove(id: string) {
    await deleteProduct(id);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes produits</h1>
          <p className="sub">Publiez vos produits : catégorie, photos, vidéos, fiche technique et prix.</p>
        </div>
        <div className="head-actions">
          <Button variant="primary" onClick={startCreate}>
            + Ajouter un produit
          </Button>
        </div>
      </div>

      {showForm ? (
        <motion.div className="panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="panel-head">
            <h2>{editing ? "Modifier le produit" : "Nouveau produit"}</h2>
          </div>
          <div className="panel-body">
            <div className="two-col">
              <label className="field">
                <span>Catégorie</span>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Sélectionner</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Marque</span>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Nom du produit</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea className="custom-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="field">
              <span>Fiche technique</span>
              <textarea
                className="custom-textarea"
                value={form.technicalSheet}
                onChange={(e) => setForm({ ...form, technicalSheet: e.target.value })}
                placeholder="Dimensions, poids, garantie…"
              />
            </label>
            <div className="two-col">
              <label className="field">
                <span>Prix indicatif (optionnel)</span>
                <input value={form.priceAmount} onChange={(e) => setForm({ ...form, priceAmount: e.target.value })} placeholder="Laisser vide = sur devis" />
              </label>
              <label className="field">
                <span>Devise</span>
                <select value={form.priceCurrency} onChange={(e) => setForm({ ...form, priceCurrency: e.target.value })}>
                  <option value="TND">TND</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Photos</span>
              <input type="file" multiple accept="image/*" disabled={uploading} onChange={(e) => void onPickPhotos(e.target.files)} />
            </label>
            {form.photoUploadIds.length > 0 ? (
              <div className="video-grid" style={{ marginBottom: 12 }}>
                {form.photoUploadIds.map((uploadId) => (
                  <div key={uploadId} style={{ position: "relative" }}>
                    <img
                      src={editing ? productPhotoUrl(editing, uploadId) : undefined}
                      alt=""
                      style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", background: "var(--paper-line)" }}
                    />
                    <button
                      type="button"
                      className="chip"
                      style={{ position: "absolute", top: 4, right: 4 }}
                      onClick={() => setForm({ ...form, photoUploadIds: form.photoUploadIds.filter((id) => id !== uploadId) })}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <label className="field">
              <span>Vidéos (liens)</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={videoDraft} onChange={(e) => setVideoDraft(e.target.value)} placeholder="Coller un lien YouTube ou Vimeo" />
                <Button variant="outline" onClick={addVideo}>
                  Ajouter
                </Button>
              </div>
            </label>
            <div className="chip-list">
              {form.videos.map((url) => (
                <button key={url} type="button" className="chip" onClick={() => setForm({ ...form, videos: form.videos.filter((v) => v !== url) })}>
                  {url}
                  <span className="material-symbols-outlined">close</span>
                </button>
              ))}
            </div>

            {error ? <p className="auth-error mt-6">{error}</p> : null}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <Button variant="primary" onClick={() => void submit()}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}

      <div className="doc-grid">
        {products.map((product) => (
          <motion.div key={product.id} className="doc-card" whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
            {product.photoUploadIds[0] ? (
              <img
                src={productPhotoUrl(product.id, product.photoUploadIds[0])}
                alt=""
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", marginBottom: 8 }}
              />
            ) : null}
            <div className="t">{product.name}</div>
            <div className="org">{product.categoryName}</div>
            {!product.active ? <div className="meta">Désactivé</div> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button variant="mini" onClick={() => startEdit(product)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => void remove(product.id)}>
                Supprimer
              </Button>
            </div>
          </motion.div>
        ))}
        {products.length === 0 && !showForm ? <p className="empty-hint">Aucun produit pour l’instant.</p> : null}
      </div>
    </section>
  );
}
