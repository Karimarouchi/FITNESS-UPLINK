import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import {
  CONTRACT_TYPES,
  createJobOffer,
  deleteJobOffer,
  fetchJobOffers,
  updateJobOffer,
  type JobOffer,
  type JobOfferStatus,
  type UpsertJobOffer,
} from "../api";
import { recruitmentError } from "@/features/recruitment/api";

const EMPTY: UpsertJobOffer = {
  title: "",
  position: "",
  location: "",
  contractType: "",
  salaryAmount: "",
  salaryCurrency: "TND",
  languages: [],
  certifications: [],
  experience: "",
  description: "",
  status: "DRAFT",
};

export function JobOffersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<JobOffer[]>([]);
  const [form, setForm] = useState<UpsertJobOffer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setItems(await fetchJobOffers());
    } catch {
      setError("Impossible de charger les offres.");
    }
  }

  if (!isBusiness(user)) {
    return <Navigate to="/" replace />;
  }

  function fill(offer: JobOffer) {
    setEditingId(offer.id);
    setForm({
      title: offer.title,
      position: offer.position ?? "",
      location: offer.location ?? "",
      contractType: offer.contractType ?? "",
      salaryAmount: offer.salaryAmount ?? "",
      salaryCurrency: offer.salaryCurrency ?? "TND",
      languages: offer.languages ?? [],
      certifications: offer.certifications ?? [],
      experience: offer.experience ?? "",
      description: offer.description ?? "",
      status: offer.status,
    });
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Le titre de l’offre est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: UpsertJobOffer = {
        ...form,
        title: form.title.trim(),
        status: form.status ?? "DRAFT",
      };
      if (editingId) {
        await updateJobOffer(editingId, payload);
        setFlash("Offre mise à jour.");
      } else {
        await createJobOffer(payload);
        setFlash("Offre créée.");
      }
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteJobOffer(id);
      setFlash("Offre supprimée.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Suppression impossible.");
    }
  }

  return (
    <section className="talent-page">
      <div className="talent-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1 className="font-display-lg-mobile text-primary">Offres d’emploi</h1>
        </div>
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <form
        className="fu-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <h2>{editingId ? "Modifier l’offre" : "Créer une offre"}</h2>
        <label className="fu-field">
          Titre
          <input className="custom-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label className="fu-field">
          Poste
          <input className="custom-input" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
        </label>
        <label className="fu-field">
          Lieu
          <input className="custom-input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        </label>
        <label className="fu-field">
          Type de contrat
          <select className="custom-input" value={form.contractType} onChange={(event) => setForm({ ...form, contractType: event.target.value })}>
            <option value="">Non précisé</option>
            {CONTRACT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="fu-inline">
          <label className="fu-field">
            Salaire
            <input className="custom-input" value={form.salaryAmount} onChange={(event) => setForm({ ...form, salaryAmount: event.target.value })} />
          </label>
          <label className="fu-field">
            Devise
            <select className="custom-input" value={form.salaryCurrency} onChange={(event) => setForm({ ...form, salaryCurrency: event.target.value })}>
              {["TND", "EUR", "USD", "GBP", "MAD"].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="fu-field">
          Expérience
          <input className="custom-input" value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
        </label>
        <label className="fu-field">
          Langues
          <input
            className="custom-input"
            value={langInput}
            placeholder="Ajouter une langue puis Entrée"
            onChange={(event) => setLangInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const value = langInput.trim();
                if (value) {
                  setForm({ ...form, languages: [...(form.languages ?? []), value] });
                  setLangInput("");
                }
              }
            }}
          />
          <div className="talent-chips">
            {(form.languages ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="talent-chip"
                onClick={() => setForm({ ...form, languages: (form.languages ?? []).filter((lang) => lang !== item) })}
              >
                {item} ×
              </button>
            ))}
          </div>
        </label>
        <label className="fu-field">
          Certifications
          <input
            className="custom-input"
            value={certInput}
            placeholder="Ajouter une certification puis Entrée"
            onChange={(event) => setCertInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const value = certInput.trim();
                if (value) {
                  setForm({ ...form, certifications: [...(form.certifications ?? []), value] });
                  setCertInput("");
                }
              }
            }}
          />
          <div className="talent-chips">
            {(form.certifications ?? []).map((item) => (
              <button
                key={item}
                type="button"
                className="talent-chip"
                onClick={() => setForm({ ...form, certifications: (form.certifications ?? []).filter((cert) => cert !== item) })}
              >
                {item} ×
              </button>
            ))}
          </div>
        </label>
        <label className="fu-field">
          Description
          <textarea className="custom-input custom-textarea" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="fu-field">
          Statut
          <select
            className="custom-input"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as JobOfferStatus })}
          >
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publiée</option>
          </select>
        </label>
        <div className="ob-country-actions">
          {editingId ? (
            <button
              className="ob-secondary"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
            >
              Annuler
            </button>
          ) : null}
          <button className="ob-primary" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer l’offre"}
          </button>
        </div>
      </form>

      <ul className="verify-list">
        {items.map((offer) => (
          <li key={offer.id} className="verify-row">
            <div className="verify-copy">
              <strong>{offer.title}</strong>
              <p className="text-on-surface-variant">
                {[offer.position, offer.location, offer.status === "PUBLISHED" ? "Publiée" : "Brouillon"].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="verify-actions">
              <button className="ob-secondary" type="button" onClick={() => fill(offer)}>
                Modifier
              </button>
              <button className="ob-secondary" type="button" onClick={() => void remove(offer.id)}>
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
