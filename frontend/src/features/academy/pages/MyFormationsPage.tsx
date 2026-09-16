import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ApiError } from "@/shared/api/client";
import {
  CONTENT_TYPE_LABELS,
  createFormation,
  createSession,
  deleteFormation,
  deleteSession,
  fetchMyFormations,
  fetchMySessions,
  fetchParticipants,
  formationImageUrl,
  updateFormation,
  uploadFormationImage,
  type ContentType,
  type Formation,
  type FormationSession,
  type Participant,
} from "../api";

const EMPTY = {
  contentType: "FORMATION" as ContentType,
  title: "",
  trainerName: "",
  description: "",
  language: "",
  location: "",
  online: false,
  priceAmount: "",
  priceCurrency: "TND",
  hasCertification: false,
  imageUploadId: null as string | null,
};

export function MyFormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function load() {
    fetchMyFormations().then(setFormations).catch(() => setFormations([]));
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function startEdit(formation: Formation) {
    setEditing(formation.id);
    setForm({
      contentType: formation.contentType,
      title: formation.title,
      trainerName: formation.trainerName ?? "",
      description: formation.description ?? "",
      language: formation.language ?? "",
      location: formation.location ?? "",
      online: formation.online,
      priceAmount: formation.priceAmount ?? "",
      priceCurrency: formation.priceCurrency ?? "TND",
      hasCertification: formation.hasCertification,
      imageUploadId: formation.imageUploadId,
    });
    setShowForm(true);
  }

  async function onPickImage(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await uploadFormationImage(files[0]);
      setForm((current) => ({ ...current, imageUploadId: result.uploadId }));
    } catch {
      setError("Impossible d'envoyer l'image.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    try {
      const request = {
        contentType: form.contentType,
        title: form.title,
        trainerName: form.trainerName || undefined,
        description: form.description || undefined,
        language: form.language || undefined,
        location: form.location || undefined,
        online: form.online,
        priceAmount: form.priceAmount || "0",
        priceCurrency: form.priceCurrency,
        hasCertification: form.hasCertification,
        imageUploadId: form.imageUploadId,
      };
      if (editing) {
        await updateFormation(editing, request);
      } else {
        await createFormation(request);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer cette formation.");
    }
  }

  async function remove(id: string) {
    await deleteFormation(id);
    if (expanded === id) setExpanded(null);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes formations</h1>
          <p className="sub">Publiez vos formations, certifications, workshops, webinars et masterclass.</p>
        </div>
        <div className="head-actions">
          <Button variant="primary" onClick={startCreate}>
            + Ajouter une formation
          </Button>
        </div>
      </div>

      {showForm ? (
        <motion.div className="panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="panel-head">
            <h2>{editing ? "Modifier la formation" : "Nouvelle formation"}</h2>
          </div>
          <div className="panel-body">
            <div className="two-col">
              <label className="field">
                <span>Type de contenu</span>
                <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value as ContentType })}>
                  {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Formateur</span>
                <input value={form.trainerName} onChange={(e) => setForm({ ...form, trainerName: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Titre</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea className="custom-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="two-col">
              <label className="field">
                <span>Langue</span>
                <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="Français, Anglais…" />
              </label>
              <label className="field">
                <span>Lieu</span>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Adresse, ou vide si en ligne"
                  disabled={form.online}
                />
              </label>
            </div>
            <label className="settings-row" style={{ maxWidth: 260 }}>
              <span>Formation en ligne</span>
              <input type="checkbox" checked={form.online} onChange={(e) => setForm({ ...form, online: e.target.checked })} />
            </label>
            <label className="settings-row" style={{ maxWidth: 260 }}>
              <span>Certification incluse</span>
              <input type="checkbox" checked={form.hasCertification} onChange={(e) => setForm({ ...form, hasCertification: e.target.checked })} />
            </label>
            <div className="two-col">
              <label className="field">
                <span>Prix (0 = gratuit)</span>
                <input value={form.priceAmount} onChange={(e) => setForm({ ...form, priceAmount: e.target.value })} />
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
              <span>Image</span>
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => void onPickImage(e.target.files)} />
            </label>
            {form.imageUploadId ? (
              <img
                src={editing ? formationImageUrl(editing, form.imageUploadId) : undefined}
                alt=""
                style={{ width: 220, aspectRatio: "16/10", objectFit: "cover", marginBottom: 12 }}
              />
            ) : null}

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
        {formations.map((formation) => (
          <motion.div key={formation.id} className="doc-card" whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
            {formation.imageUploadId ? (
              <img
                src={formationImageUrl(formation.id, formation.imageUploadId)}
                alt=""
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", marginBottom: 8 }}
              />
            ) : null}
            <div className="t">{formation.title}</div>
            <div className="org">{CONTENT_TYPE_LABELS[formation.contentType]}</div>
            <div className="meta">
              {Number(formation.priceAmount) > 0 ? `${formation.priceAmount} ${formation.priceCurrency}` : "Gratuit"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Button variant="mini" onClick={() => startEdit(formation)}>
                Modifier
              </Button>
              <Button variant="mini" onClick={() => setExpanded(expanded === formation.id ? null : formation.id)}>
                {expanded === formation.id ? "Fermer les sessions" : "Gérer les sessions"}
              </Button>
              <Button variant="danger" onClick={() => void remove(formation.id)}>
                Supprimer
              </Button>
            </div>
          </motion.div>
        ))}
        {formations.length === 0 && !showForm ? <p className="empty-hint">Aucune formation pour l'instant.</p> : null}
      </div>

      {expanded ? <SessionsPanel formationId={expanded} /> : null}
    </section>
  );
}

function SessionsPanel({ formationId }: { formationId: string }) {
  const [sessions, setSessions] = useState<FormationSession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", time: "10:00", durationMinutes: 120, capacity: 10 });
  const [error, setError] = useState<string | null>(null);
  const [viewingParticipants, setViewingParticipants] = useState<string | null>(null);

  function load() {
    fetchMySessions(formationId).then(setSessions).catch(() => setSessions([]));
  }

  useEffect(() => {
    load();
  }, [formationId]);

  async function addSession() {
    setError(null);
    if (!form.date) {
      setError("Choisissez une date.");
      return;
    }
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      await createSession(formationId, { scheduledAt, durationMinutes: form.durationMinutes, capacity: form.capacity });
      setShowForm(false);
      setForm({ date: "", time: "10:00", durationMinutes: 120, capacity: 10 });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer cette session.");
    }
  }

  async function remove(sessionId: string) {
    await deleteSession(formationId, sessionId);
    load();
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Sessions</h2>
        <Button variant="mini" onClick={() => setShowForm((v) => !v)}>
          + Session
        </Button>
      </div>
      {showForm ? (
        <div className="panel-body" style={{ borderBottom: "1px solid var(--paper-line)" }}>
          <div className="two-col">
            <label className="field">
              <span>Date</span>
              <input type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="field">
              <span>Heure</span>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </label>
            <label className="field">
              <span>Durée (minutes)</span>
              <input type="number" min={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Capacité</span>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </label>
          </div>
          {error ? <p className="auth-error">{error}</p> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Button variant="primary" onClick={() => void addSession()}>Ajouter</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      ) : null}
      {sessions.length === 0 ? (
        <p className="empty-hint" style={{ padding: "0 22px 20px" }}>Aucune session programmée.</p>
      ) : (
        sessions.map((session) => (
          <div key={session.id}>
            <div className="booking-item">
              <div className="booking-time">{new Date(session.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
              <div className="booking-body">
                <div className="t">{session.durationMinutes} min</div>
                <div className="s">{session.confirmedCount}/{session.capacity} inscrits · {session.seatsLeft} places restantes</div>
                <StatusPill tone={session.status === "CANCELLED" ? "refused" : session.status === "COMPLETED" ? "verified" : "new"}>
                  {session.status === "SCHEDULED" ? "À venir" : session.status === "COMPLETED" ? "Terminée" : "Annulée"}
                </StatusPill>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="mini" onClick={() => setViewingParticipants(viewingParticipants === session.id ? null : session.id)}>
                  Participants
                </Button>
                {session.status === "SCHEDULED" ? (
                  <Button variant="danger" onClick={() => void remove(session.id)}>
                    Annuler
                  </Button>
                ) : null}
              </div>
            </div>
            {viewingParticipants === session.id ? (
              <ParticipantsList formationId={formationId} sessionId={session.id} />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function ParticipantsList({ formationId, sessionId }: { formationId: string; sessionId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    fetchParticipants(formationId, sessionId).then(setParticipants).catch(() => setParticipants([]));
  }, [formationId, sessionId]);

  return (
    <div className="panel" style={{ margin: "4px 22px 14px", padding: "14px 18px" }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13.5 }}>Participants</div>
      {participants.length === 0 ? (
        <p className="empty-hint" style={{ padding: 0 }}>Aucun participant pour le moment.</p>
      ) : (
        participants.map((p) => (
          <div key={p.registrationId} className="exp-item">
            <div className="exp-body">
              <div className="t">{p.memberDisplayName}</div>
              <div className="d">
                {p.status === "CONFIRMED" ? "Confirmé" : p.status === "PENDING_PAYMENT" ? "En attente de paiement" : `Liste d'attente #${p.waitlistPosition}`}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
