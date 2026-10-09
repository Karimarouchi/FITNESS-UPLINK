import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Plus, X } from "lucide-react";
import { BoDrawer } from "@/components/ui/BoOverlay";
import { ApiError } from "@/shared/api/client";
import {
  CONDITION_LABELS,
  productPhotoUrl,
  saveProduct,
  uploadProductPhoto,
  type ItemCondition,
  type Product,
  type ProductCategory,
} from "./api";

const MAX_PHOTOS = 8;
const CURRENCIES = ["TND", "EUR", "USD", "MAD", "DZD"];

type Draft = {
  categoryId: string;
  name: string;
  brand: string;
  condition: ItemCondition;
  description: string;
  technicalSheet: string;
  showPrice: boolean;
  priceAmount: string;
  priceCurrency: string;
  photoUploadIds: string[];
  videos: string[];
  active: boolean;
};

function draftFrom(product: Product | null): Draft {
  return {
    categoryId: product?.categoryId ?? "",
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    condition: product?.condition ?? "NEW",
    description: product?.description ?? "",
    technicalSheet: product?.technicalSheet ?? "",
    showPrice: product ? product.priceAmount != null : false,
    priceAmount: product?.priceAmount != null ? String(product.priceAmount) : "",
    priceCurrency: product?.priceCurrency ?? "TND",
    photoUploadIds: product?.photoUploadIds ?? [],
    videos: product?.videos ?? [],
    active: product?.active ?? true,
  };
}

type Props = {
  product: Product | null;
  categories: ProductCategory[];
  onClose: () => void;
  onSaved: (product: Product) => void;
};

export function ProductEditorDrawer({ product, categories, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(product));
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [videoDraft, setVideoDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  useEffect(() => () => Object.values(previewsRef.current).forEach((url) => URL.revokeObjectURL(url)), []);

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  function photoSrc(uploadId: string) {
    if (previews[uploadId]) return previews[uploadId];
    return product ? productPhotoUrl(product.id, uploadId) : undefined;
  }

  async function onPickPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const room = MAX_PHOTOS - draft.photoUploadIds.length;
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) continue;
        const result = await uploadProductPhoto(file);
        const url = URL.createObjectURL(file);
        setPreviews((current) => ({ ...current, [result.uploadId]: url }));
        setDraft((current) => ({ ...current, photoUploadIds: [...current.photoUploadIds, result.uploadId] }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’envoyer cette photo.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(uploadId: string) {
    patch({ photoUploadIds: draft.photoUploadIds.filter((id) => id !== uploadId) });
  }

  function makeCover(uploadId: string) {
    patch({ photoUploadIds: [uploadId, ...draft.photoUploadIds.filter((id) => id !== uploadId)] });
  }

  function addVideo() {
    const url = videoDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("Le lien vidéo doit commencer par http:// ou https://");
      return;
    }
    if (!draft.videos.includes(url)) patch({ videos: [...draft.videos, url] });
    setVideoDraft("");
  }

  async function submit() {
    setError(null);
    if (!draft.name.trim()) return setError("Donnez un nom à votre article.");
    if (!draft.categoryId) return setError("Choisissez une catégorie.");
    const amount = draft.priceAmount.trim().replace(",", ".");
    if (draft.showPrice && (!amount || Number.isNaN(Number(amount)) || Number(amount) < 0)) {
      return setError("Indiquez un prix valide ou choisissez « Prix sur demande ».");
    }
    setSaving(true);
    try {
      const saved = await saveProduct(product?.id ?? null, {
        categoryId: draft.categoryId,
        name: draft.name.trim(),
        brand: draft.brand.trim() || null,
        description: draft.description.trim() || null,
        technicalSheet: draft.technicalSheet.trim() || null,
        priceAmount: draft.showPrice ? amount : null,
        priceCurrency: draft.showPrice ? draft.priceCurrency : null,
        photoUploadIds: draft.photoUploadIds,
        videos: draft.videos,
        active: draft.active,
        condition: draft.condition,
      });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer cet article.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BoDrawer
      title={product ? "Modifier l’article" : "Nouvel article"}
      subtitle="Les acheteurs vous contactent par messagerie. Le prix est facultatif."
      onClose={onClose}
      footer={
        <>
          <label className="bo-toggle">
            <input type="checkbox" checked={draft.active} onChange={(event) => patch({ active: event.target.checked })} />
            <span className="bo-toggle-track" />
            {draft.active ? "Publié" : "Brouillon"}
          </label>
          <button type="button" className="bo-btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="bo-btn bo-btn--primary" disabled={saving || uploading} onClick={() => void submit()}>
            {saving ? <Loader2 size={16} className="bo-spin" /> : null}
            {product ? "Enregistrer" : "Publier l’article"}
          </button>
        </>
      }
    >
      {product?.hiddenByAdmin ? (
        <div className="bo-alert is-danger" style={{ marginBottom: 18 }}>
          <div>
            <strong>Article masqué par la modération.</strong> {product.hiddenReason}
            <br />
            Corrigez l’annonce : l’équipe pourra la rétablir.
          </div>
        </div>
      ) : null}
      {error ? <p className="bo-error">{error}</p> : null}

      <div className="bo-form-section">
        <div className="bo-form-section-title">Informations</div>
        <label className="bo-field">
          <span className="bo-field-label">Nom de l’article</span>
          <input
            className="bo-input"
            value={draft.name}
            maxLength={200}
            placeholder="Ex. Tapis de course pliable T-900"
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <div className="bo-field-row">
          <label className="bo-field">
            <span className="bo-field-label">Catégorie</span>
            <select className="bo-select" value={draft.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
              <option value="">Sélectionner…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="bo-field">
            <span className="bo-field-label">
              Marque <em>(facultatif)</em>
            </span>
            <input className="bo-input" value={draft.brand} maxLength={120} onChange={(event) => patch({ brand: event.target.value })} />
          </label>
        </div>
        <div className="bo-field">
          <span className="bo-field-label">État</span>
          <div className="bo-choices">
            {(Object.keys(CONDITION_LABELS) as ItemCondition[]).map((value) => (
              <button
                key={value}
                type="button"
                className={draft.condition === value ? "bo-choice is-active" : "bo-choice"}
                onClick={() => patch({ condition: value })}
              >
                {CONDITION_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bo-form-section">
        <div className="bo-form-section-title">Prix</div>
        <div className="bo-field">
          <div className="bo-seg">
            <button type="button" className={!draft.showPrice ? "is-active" : ""} onClick={() => patch({ showPrice: false })}>
              Prix sur demande
            </button>
            <button type="button" className={draft.showPrice ? "is-active" : ""} onClick={() => patch({ showPrice: true })}>
              Afficher un prix
            </button>
          </div>
          <span className="bo-field-hint">
            {draft.showPrice
              ? "Prix indicatif affiché sur l’annonce. La transaction se fait directement avec l’acheteur."
              : "Aucun prix affiché : les acheteurs vous écrivent pour en discuter."}
          </span>
        </div>
        {draft.showPrice ? (
          <label className="bo-field">
            <span className="bo-field-label">Prix indicatif</span>
            <div className="bo-input-group">
              <input
                className="bo-input"
                inputMode="decimal"
                value={draft.priceAmount}
                placeholder="0,00"
                onChange={(event) => patch({ priceAmount: event.target.value })}
              />
              <select className="bo-select" value={draft.priceCurrency} onChange={(event) => patch({ priceCurrency: event.target.value })}>
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </label>
        ) : null}
      </div>

      <div className="bo-form-section">
        <div className="bo-form-section-title">
          Photos · {draft.photoUploadIds.length}/{MAX_PHOTOS}
        </div>
        <div className="bo-photos">
          {draft.photoUploadIds.map((uploadId, index) => (
            <div className="bo-photo" key={uploadId}>
              {photoSrc(uploadId) ? <img src={photoSrc(uploadId)} alt="" /> : null}
              {index === 0 ? (
                <span className="bo-photo-badge">Couverture</span>
              ) : (
                <button type="button" className="bo-photo-badge" style={{ border: 0, cursor: "pointer" }} onClick={() => makeCover(uploadId)}>
                  Mettre en avant
                </button>
              )}
              <button type="button" className="bo-photo-remove" onClick={() => removePhoto(uploadId)} aria-label="Retirer la photo">
                <X size={14} />
              </button>
            </div>
          ))}
          {draft.photoUploadIds.length < MAX_PHOTOS ? (
            <label className="bo-photo-add">
              {uploading ? <Loader2 size={20} className="bo-spin" /> : <ImagePlus size={22} />}
              {uploading ? "Envoi…" : "Ajouter"}
              <input type="file" accept="image/*" multiple disabled={uploading} onChange={(event) => void onPickPhotos(event.target.files)} />
            </label>
          ) : null}
        </div>
        <p className="bo-field-hint" style={{ marginTop: 8 }}>
          JPG ou PNG. La première photo sert de couverture dans le catalogue.
        </p>
      </div>

      <div className="bo-form-section">
        <div className="bo-form-section-title">Description</div>
        <label className="bo-field">
          <span className="bo-field-label">Description</span>
          <textarea
            className="bo-textarea"
            value={draft.description}
            placeholder="Points forts, usage recommandé, contenu du colis…"
            onChange={(event) => patch({ description: event.target.value })}
          />
        </label>
        <label className="bo-field">
          <span className="bo-field-label">
            Fiche technique <em>(facultatif)</em>
          </span>
          <textarea
            className="bo-textarea"
            value={draft.technicalSheet}
            placeholder={"Dimensions : …\nPoids : …\nGarantie : …"}
            onChange={(event) => patch({ technicalSheet: event.target.value })}
          />
        </label>
        <div className="bo-field">
          <span className="bo-field-label">
            Vidéos <em>(liens YouTube, Vimeo…)</em>
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="bo-input"
              value={videoDraft}
              placeholder="https://"
              onChange={(event) => setVideoDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addVideo();
                }
              }}
            />
            <button type="button" className="bo-btn" onClick={addVideo}>
              <Plus size={16} />
              Ajouter
            </button>
          </div>
          {draft.videos.length ? (
            <div className="bo-chip-list">
              {draft.videos.map((url) => (
                <span className="bo-chip" key={url}>
                  <Link2 size={13} />
                  <span>{url}</span>
                  <button type="button" onClick={() => patch({ videos: draft.videos.filter((value) => value !== url) })} aria-label="Retirer">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </BoDrawer>
  );
}
