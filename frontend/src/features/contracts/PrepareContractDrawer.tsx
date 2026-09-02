import { useState } from "react";
import { ApiError } from "@/shared/api/client";
import {
  opportunityLabel,
  type Recruitment,
} from "@/features/recruitment/api";
import {
  cancelContract,
  contractError,
  createContract,
  emptyTerms,
  fetchContractDocument,
  sendContract,
  uploadContractPdf,
  type Contract,
  type ContractSource,
  type ContractTerms,
} from "./api";

type Step = "source" | "form" | "file" | "preview";

export function PrepareContractDrawer({
  item,
  employerName,
  onClose,
  onSent,
}: {
  item: Recruitment;
  employerName: string;
  onClose: () => void;
  onSent: (item: Recruitment) => void;
}) {
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<ContractSource>("TEMPLATE");
  const [terms, setTerms] = useState<ContractTerms>(emptyTerms(item));
  const [contract, setContract] = useState<Contract | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function createDraft(next: ContractSource, nextTerms?: ContractTerms) {
    setBusy(true);
    try {
      const created = await createContract({
        recruitmentId: item.id,
        source: next,
        terms: next === "TEMPLATE" ? nextTerms ?? terms : undefined,
      });
      setContract(created);
      setError(null);
      return created;
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Impossible de préparer le contrat.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function continueFromSource() {
    if (source === "TEMPLATE") {
      setStep("form");
      return;
    }
    const created = await createDraft("IMPORT");
    if (created) {
      setStep("file");
    }
  }

  async function continueFromForm() {
    const created = await createDraft("TEMPLATE", terms);
    if (created) {
      setStep("preview");
    }
  }

  async function continueFromFile() {
    if (!contract || !file) {
      setError("Ajoutez un PDF avant de continuer.");
      return;
    }
    setBusy(true);
    try {
      const updated = await uploadContractPdf(contract.id, file);
      setContract(updated);
      setError(null);
      setStep("preview");
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Impossible d’importer le PDF.");
    } finally {
      setBusy(false);
    }
  }

  async function previewDocument() {
    if (!contract) {
      return;
    }
    const blob = await fetchContractDocument(contract.id, false);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function send() {
    if (!contract) {
      return;
    }
    setBusy(true);
    try {
      await sendContract(contract.id);
      onSent({
        ...item,
        status: "CONTRACT_SENT",
        contract: {
          id: contract.id,
          status: "SENT",
          candidateSigned: false,
          employerSigned: false,
          completed: false,
          sentAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Le contrat n’a pas pu être envoyé.");
    } finally {
      setBusy(false);
    }
  }

  function takeFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Ce fichier est trop volumineux (10 Mo maximum).");
      return;
    }
    setError(null);
    setFile(next);
  }

  return (
    <div className="fu-backdrop" role="presentation" onClick={onClose}>
      <aside className="fu-drawer verify-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="ob-link fiche-back" type="button" onClick={onClose}>
          Fermer
        </button>
        <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
        <h2 className="font-display-lg-mobile text-primary">Préparer un contrat</h2>
        <p>Candidat : {item.candidate.displayName}</p>
        <p>Employeur : {employerName}</p>
        <p>Offre : {opportunityLabel(item)}</p>
        {error ? <p className="auth-error">{error}</p> : null}

        {step === "source" ? (
          <>
            <fieldset className="fu-radios">
              <legend>Document</legend>
              <label>
                <input type="radio" checked={source === "TEMPLATE"} onChange={() => setSource("TEMPLATE")} />
                Générer depuis un modèle
              </label>
              <label>
                <input type="radio" checked={source === "IMPORT"} onChange={() => setSource("IMPORT")} />
                Importer un PDF
              </label>
            </fieldset>
            {source === "TEMPLATE" ? (
              <p className="talent-meta">
                Le modèle juridique n’est pas encore validé. Le PDF généré est préparatoire et ne constitue pas un contrat opposable.
              </p>
            ) : null}
            <div className="fiche-actions">
              <button className="ob-secondary" type="button" onClick={onClose}>
                Annuler
              </button>
              <button className="ob-primary" type="button" disabled={busy} onClick={() => void continueFromSource()}>
                Continuer
              </button>
            </div>
          </>
        ) : null}

        {step === "form" ? (
          <form
            className="fu-form"
            onSubmit={(event) => {
              event.preventDefault();
              void continueFromForm();
            }}
          >
            <label className="fu-field">
              Poste
              <input className="custom-input" value={terms.position} onChange={(event) => setTerms({ ...terms, position: event.target.value })} />
            </label>
            <label className="fu-field">
              Type de contrat
              <input className="custom-input" value={terms.contractType} onChange={(event) => setTerms({ ...terms, contractType: event.target.value })} />
            </label>
            <div className="fu-inline">
              <label className="fu-field">
                Salaire
                <input className="custom-input" value={terms.salaryAmount} onChange={(event) => setTerms({ ...terms, salaryAmount: event.target.value })} />
              </label>
              <label className="fu-field">
                Devise
                <input className="custom-input" value={terms.salaryCurrency} onChange={(event) => setTerms({ ...terms, salaryCurrency: event.target.value })} />
              </label>
            </div>
            <label className="fu-field">
              Date de début
              <input className="custom-input" type="date" value={terms.startDate} onChange={(event) => setTerms({ ...terms, startDate: event.target.value })} />
            </label>
            <label className="fu-field">
              Lieu
              <input className="custom-input" value={terms.location} onChange={(event) => setTerms({ ...terms, location: event.target.value })} />
            </label>
            <label className="fu-field">
              Informations complémentaires
              <textarea className="custom-input custom-textarea" value={terms.extra} onChange={(event) => setTerms({ ...terms, extra: event.target.value })} />
            </label>
            <div className="fiche-actions">
              <button className="ob-secondary" type="button" onClick={() => setStep("source")}>
                Retour
              </button>
              <button className="ob-primary" type="submit" disabled={busy}>
                Continuer
              </button>
            </div>
          </form>
        ) : null}

        {step === "file" ? (
          <>
            <div
              className={`fu-dropzone${dragOver ? " is-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                takeFile(event.dataTransfer.files[0] ?? null);
              }}
            >
              <p>Glissez un PDF ici ou sélectionnez un fichier.</p>
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => takeFile(event.target.files?.[0] ?? null)} />
            </div>
            {file ? (
              <div className="verify-row">
                <div className="verify-copy">
                  <strong>{file.name}</strong>
                  <p>{Math.round(file.size / 1024)} Ko</p>
                </div>
                <button className="ob-secondary" type="button" onClick={() => setFile(null)}>
                  Supprimer
                </button>
              </div>
            ) : null}
            <div className="fiche-actions">
              <button
                className="ob-secondary"
                type="button"
                onClick={() => {
                  if (contract) {
                    void cancelContract(contract.id).catch(() => undefined);
                  }
                  setStep("source");
                }}
              >
                Retour
              </button>
              <button className="ob-primary" type="button" disabled={busy || !file} onClick={() => void continueFromFile()}>
                Continuer
              </button>
            </div>
          </>
        ) : null}

        {step === "preview" && contract ? (
          <>
            <h3>Vérifier le contrat</h3>
            <p>Candidat : {contract.candidateName}</p>
            <p>Employeur : {contract.employerName}</p>
            <p>Poste : {contract.terms?.position || opportunityLabel(item)}</p>
            <p>Document : {contract.originalFileName || "contrat.pdf"}</p>
            {contract.templateNotice ? <p className="talent-meta">{contract.templateNotice}</p> : null}
            <button className="ob-secondary" type="button" onClick={() => void previewDocument()}>
              Voir le document
            </button>
            <h3>Signataires</h3>
            <ol className="fiche-list">
              {contract.signers.map((signer) => (
                <li key={signer.id}>
                  <strong>{signer.displayName}</strong>
                  <div>{signer.role === "CANDIDATE" ? "Candidat" : "Employeur"}</div>
                  <div>{signer.email}</div>
                </li>
              ))}
            </ol>
            <div className="fiche-actions">
              <button className="ob-secondary" type="button" onClick={() => setStep(source === "TEMPLATE" ? "form" : "file")}>
                Retour
              </button>
              <button className="ob-primary" type="button" disabled={busy} onClick={() => void send()}>
                {busy ? "Envoi…" : "Envoyer pour signature"}
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
