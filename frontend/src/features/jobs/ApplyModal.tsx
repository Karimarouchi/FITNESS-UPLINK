import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import { applyToOpportunity, uploadCoverLetter, type Opportunity } from "./api";
import { recruitmentError } from "@/features/recruitment/api";

export function ApplyModal({
  offer,
  onClose,
  onApplied,
}: {
  offer: Opportunity;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [letter, setLetter] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(list: FileList | null) {
    const file = list?.[0];
    if (!file) {
      return;
    }
    setError(null);
    try {
      const uploaded = await uploadCoverLetter(file);
      setUploadId(uploaded.id);
      setFileName(uploaded.originalFilename);
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible d’envoyer ce PDF.");
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await applyToOpportunity(offer.id, {
        coverLetter: letter.trim() || undefined,
        coverLetterUploadId: uploadId ?? undefined,
      });
      onApplied();
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de postuler.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fu-backdrop" role="presentation" onClick={onClose}>
      <div className="fu-modal hire-apply-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-display-lg-mobile text-primary">Postuler</h2>
        <p className="font-body-md text-on-surface-variant">
          Votre profil et votre CV sont envoyés à {offer.employerName} pour « {offer.title} ».
        </p>
        <label className="fu-field">
          Lettre de motivation <span className="text-on-surface-variant">(optionnel)</span>
          <textarea
            className="custom-input custom-textarea"
            rows={5}
            maxLength={4000}
            value={letter}
            placeholder="Expliquez en quelques lignes pourquoi ce poste vous correspond."
            onChange={(event) => setLetter(event.target.value)}
          />
        </label>
        <label className="fu-field">
          Ou joindre un PDF
          <input className="custom-input" type="file" accept="application/pdf" onChange={(event) => void onFile(event.target.files)} />
          {fileName ? <span className="text-on-surface-variant">{fileName}</span> : null}
        </label>
        {error ? <p className="auth-error">{error}</p> : null}
        <div className="ob-country-actions">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? "Envoi…" : "Envoyer ma candidature"}
          </Button>
        </div>
      </div>
    </div>
  );
}
