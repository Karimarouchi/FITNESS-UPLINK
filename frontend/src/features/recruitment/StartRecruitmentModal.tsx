import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { fetchJobOffers, type JobOffer } from "@/features/jobs/api";
import { recruitmentError, startRecruitment, type Recruitment } from "./api";

export function StartRecruitmentModal({
  candidateId,
  candidateName,
  onClose,
  onStarted,
}: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onStarted: (entry: Recruitment) => void;
}) {
  const [mode, setMode] = useState<"OFFER" | "DIRECT">("DIRECT");
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [jobOfferId, setJobOfferId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchJobOffers()
      .then(setOffers)
      .catch(() => setOffers([]));
  }, []);

  async function submit() {
    setError(null);
    if (mode === "OFFER" && !jobOfferId) {
      setError("Choisissez une offre d’emploi.");
      return;
    }
    setSubmitting(true);
    try {
      const entry = await startRecruitment({
        candidateId,
        jobOfferId: mode === "OFFER" ? jobOfferId : undefined,
        internalNote: note.trim() || undefined,
      });
      onStarted(entry);
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de démarrer le recrutement.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fu-backdrop" role="presentation" onClick={onClose}>
      <div className="fu-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-display-lg-mobile text-primary">Démarrer un recrutement avec {candidateName}</h2>
        <p className="font-body-md text-on-surface-variant">Ajoutez ce candidat à votre processus de recrutement.</p>
        <fieldset className="fu-radios">
          <legend>Pour quelle opportunité ?</legend>
          <label>
            <input type="radio" name="recruit-mode" checked={mode === "OFFER"} onChange={() => setMode("OFFER")} />
            Associer à une offre d’emploi
          </label>
          <label>
            <input type="radio" name="recruit-mode" checked={mode === "DIRECT"} onChange={() => setMode("DIRECT")} />
            Recrutement direct
          </label>
        </fieldset>
        {mode === "OFFER" ? (
          <label className="fu-field">
            Offre d’emploi
            <select className="custom-input" value={jobOfferId} onChange={(event) => setJobOfferId(event.target.value)}>
              <option value="">Choisir une offre</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.title}
                  {offer.location ? ` — ${offer.location}` : ""}
                </option>
              ))}
            </select>
            {offers.length === 0 ? (
              <span className="text-on-surface-variant">Aucune offre pour le moment. Créez-en une depuis Offres d’emploi, ou choisissez le recrutement direct.</span>
            ) : null}
          </label>
        ) : null}
        <label className="fu-field">
          Note interne — facultative
          <textarea
            className="custom-input custom-textarea"
            value={note}
            placeholder="Très bon profil, disponible immédiatement."
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <div className="ob-country-actions">
          <button className="ob-secondary" type="button" onClick={onClose}>
            Annuler
          </button>
          <button className="ob-primary" type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Ajout…" : "Démarrer le recrutement"}
          </button>
        </div>
      </div>
    </div>
  );
}
