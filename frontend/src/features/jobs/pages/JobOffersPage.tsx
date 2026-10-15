import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import { can, useBilling } from "@/features/billing/useBilling";
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

function contractLabel(value: string | null | undefined) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? null;
}

export function JobOffersPage() {
  const { user } = useAuth();
  const billing = useBilling();
  const canJobs = can(billing, "hire.jobs");
  const jobLimit = billing?.limits["hire.jobs"];
  const [items, setItems] = useState<JobOffer[]>([]);
  const [form, setForm] = useState<UpsertJobOffer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

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
    return <Navigate to="/app/dashboard" replace />;
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setLangInput("");
    setCertInput("");
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  function openCreate() {
    resetForm();
    setFormOpen(true);
  }

  function fill(offer: JobOffer) {
    setFormOpen(true);
    setEditingId(offer.id);
    setLangInput("");
    setCertInput("");
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

  function addChip(kind: "languages" | "certifications", raw: string) {
    const value = raw.trim();
    if (!value) {
      return;
    }
    const current = form[kind] ?? [];
    if (current.includes(value)) {
      return;
    }
    setForm({ ...form, [kind]: [...current, value] });
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
      resetForm();
      setFormOpen(false);
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
      if (editingId === id) {
        closeForm();
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Suppression impossible.");
    }
  }

  return (
    <section className="hire-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Offres d’emploi</h1>
          <p className="sub">
            Cartes brouillon ou publiée.
            {jobLimit != null ? ` Offre actuelle : ${items.length} / ${jobLimit} offres.` : ""}
          </p>
        </div>
        {canJobs && (jobLimit == null || items.length < jobLimit) ? (
          <Button variant="primary" type="button" onClick={openCreate}>
            Nouvelle offre
          </Button>
        ) : canJobs ? (
          <Button variant="outline" to="/app/profile/plan">
            Limite d’offres atteinte
          </Button>
        ) : (
          <Button variant="outline" to="/app/profile/plan">
            Débloquer les offres
          </Button>
        )}
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {formOpen ? (
        <Panel title={editingId ? "Modifier l’offre" : "Nouvelle offre"} body>
          <form
            className="jobs-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="jobs-fields">
              <div className="field">
                <label htmlFor="job-title">Titre</label>
                <input
                  id="job-title"
                  value={form.title}
                  placeholder="Coach musculation — salle de Tunis"
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="job-position">Poste</label>
                <input
                  id="job-position"
                  value={form.position}
                  placeholder="Coach sportif, préparateur physique…"
                  onChange={(event) => setForm({ ...form, position: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="job-location">Lieu</label>
                <input
                  id="job-location"
                  value={form.location}
                  placeholder="Tunis, hybride, à distance…"
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="job-contract">Type de contrat</label>
                <select
                  id="job-contract"
                  value={form.contractType}
                  onChange={(event) => setForm({ ...form, contractType: event.target.value })}
                >
                  <option value="">Non précisé</option>
                  {CONTRACT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="job-salary">Salaire</label>
                <div className="jobs-salary">
                  <input
                    id="job-salary"
                    value={form.salaryAmount}
                    placeholder="Ex. 1800"
                    onChange={(event) => setForm({ ...form, salaryAmount: event.target.value })}
                  />
                  <select
                    aria-label="Devise"
                    value={form.salaryCurrency}
                    onChange={(event) => setForm({ ...form, salaryCurrency: event.target.value })}
                  >
                    {["TND", "EUR", "USD", "GBP", "MAD"].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="job-experience">Expérience</label>
                <input
                  id="job-experience"
                  value={form.experience}
                  placeholder="Ex. 3 ans minimum"
                  onChange={(event) => setForm({ ...form, experience: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="job-languages">Langues</label>
                <input
                  id="job-languages"
                  value={langInput}
                  placeholder="Français, puis Entrée"
                  onChange={(event) => setLangInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addChip("languages", langInput);
                      setLangInput("");
                    }
                  }}
                />
                <div className="jobs-chips">
                  {(form.languages ?? []).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="tag"
                      onClick={() => setForm({ ...form, languages: (form.languages ?? []).filter((lang) => lang !== item) })}
                    >
                      {item} ×
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="job-certs">Certifications</label>
                <input
                  id="job-certs"
                  value={certInput}
                  placeholder="BPJEPS, puis Entrée"
                  onChange={(event) => setCertInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addChip("certifications", certInput);
                      setCertInput("");
                    }
                  }}
                />
                <div className="jobs-chips">
                  {(form.certifications ?? []).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="tag"
                      onClick={() =>
                        setForm({ ...form, certifications: (form.certifications ?? []).filter((cert) => cert !== item) })
                      }
                    >
                      {item} ×
                    </button>
                  ))}
                </div>
              </div>
              <div className="field field--full">
                <label htmlFor="job-description">Description</label>
                <textarea
                  id="job-description"
                  value={form.description}
                  placeholder="Missions, horaires, public visé, avantages…"
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="job-status">Statut</label>
                <select
                  id="job-status"
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value as JobOfferStatus })}
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PUBLISHED">Publiée</option>
                </select>
              </div>
            </div>
            <div className="jobs-actions">
              <Button variant="outline" type="button" onClick={closeForm}>
                Annuler
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer l’offre"}
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {items.length === 0 && !error && !formOpen ? (
        <div className="fu-empty">
          <p>Aucune offre pour le moment.</p>
          <Button variant="primary" type="button" onClick={openCreate}>
            Nouvelle offre
          </Button>
        </div>
      ) : (
        <div className="jobx-grid">
          {items.map((offer, index) => {
            const published = offer.status === "PUBLISHED";
            const salary = offer.salaryAmount ? `${offer.salaryAmount} ${offer.salaryCurrency ?? ""}`.trim() : null;
            const facts = [
              { icon: "badge", text: offer.position },
              { icon: "location_on", text: offer.location },
              { icon: "description", text: contractLabel(offer.contractType) },
              { icon: "payments", text: salary },
              { icon: "workspace_premium", text: offer.experience },
            ].filter((fact) => fact.text);
            return (
              <article
                key={offer.id}
                className={published ? "jobx-card is-published" : "jobx-card"}
                style={{ "--i": index } as React.CSSProperties}
              >
                <div className="jobx-top">
                  <span className="jobx-icon material-symbols-outlined" aria-hidden="true">
                    work
                  </span>
                  <StatusPill tone={published ? "verified" : "pending"}>{published ? "Publiée" : "Brouillon"}</StatusPill>
                </div>
                <h3 className="jobx-title">{offer.title}</h3>
                {facts.length ? (
                  <ul className="jobx-facts">
                    {facts.map((fact) => (
                      <li key={fact.icon}>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {fact.icon}
                        </span>
                        {fact.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="jobx-empty">Détails non renseignés</p>
                )}
                <div className="jobx-actions">
                  <button className="jobx-btn is-edit" type="button" onClick={() => fill(offer)}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      edit
                    </span>
                    Modifier
                  </button>
                  <button className="jobx-btn is-delete" type="button" onClick={() => void remove(offer.id)}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      delete
                    </span>
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
