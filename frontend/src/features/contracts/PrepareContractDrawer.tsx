import { useEffect, useState } from "react";
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
  fetchContract,
  fetchContractDocument,
  sendContract,
  uploadContractPdf,
  type Contract,
  type ContractSource,
  type ContractTerms,
} from "./api";
import { CONTRACT_TYPES } from "@/features/jobs/api";

type Step = "source" | "form" | "file" | "preview";

export function PrepareContractDrawer({
  item,
  employerName,
  initialTerms,
  draftId,
  onClose,
  onSent,
}: {
  item: Recruitment;
  employerName: string;
  /** Terms already agreed in the negotiation step. */
  initialTerms?: Partial<ContractTerms>;
  /** A draft already created for this recruitment: the drawer opens on its verification step. */
  draftId?: string;
  onClose: () => void;
  onSent: (item: Recruitment) => void;
}) {
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<ContractSource>("TEMPLATE");
  const [terms, setTerms] = useState<ContractTerms>({ ...emptyTerms(item), ...initialTerms });
  const [contract, setContract] = useState<Contract | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!draftId) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    fetchContract(draftId)
      .then((existing) => {
        if (cancelled) {
          return;
        }
        setContract(existing);
        setSource(existing.source);
        setStep("preview");
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger le brouillon du contrat.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

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
    if (!terms.position.trim() || !terms.contractType.trim()) {
      setError("Indiquez le poste et le type de contrat.");
      return;
    }
    const salary = Number(String(terms.salaryAmount).replace(",", "."));
    if (!salary || salary <= 0) {
      setError("Indiquez un salaire supérieur à 0.");
      return;
    }
    if (!terms.startDate) {
      setError("Indiquez la date de début.");
      return;
    }
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
      <aside className="fu-drawer verify-drawer pcd" role="dialog" aria-modal="true" aria-label="Préparer un contrat" onClick={(event) => event.stopPropagation()}>
        <div className="pcd-top">
          <p className="pcd-kicker">Recrutement</p>
          <button className="pcd-close" type="button" onClick={onClose} aria-label="Fermer">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <h2 className="pcd-title">Préparer un contrat</h2>
        <dl className="pcd-parties">
          <div>
            <dt>Candidat</dt>
            <dd>{item.candidate.displayName}</dd>
          </div>
          <div>
            <dt>Employeur</dt>
            <dd>{employerName}</dd>
          </div>
          <div>
            <dt>Offre</dt>
            <dd>{opportunityLabel(item)}</dd>
          </div>
        </dl>
        <ol className="pcd-steps" aria-label="Étapes">
          {["Document", "Détails", "Vérification"].map((label, index) => {
            const active = step === "source" ? 0 : step === "preview" ? 2 : 1;
            return (
              <li key={label} className={index < active ? "is-done" : index === active ? "is-current" : ""}>
                <span>{index < active ? "✓" : index + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
        {error ? <p className="pcd-error" role="alert">{error}</p> : null}

        {step === "source" ? (
          <>
            <div className="pcd-choices" role="radiogroup" aria-label="Document">
              <button type="button" role="radio" aria-checked={source === "TEMPLATE"} className={source === "TEMPLATE" ? "is-on" : ""} onClick={() => setSource("TEMPLATE")}>
                <span className="material-symbols-outlined" aria-hidden="true">description</span>
                <strong>Générer depuis un modèle</strong>
                <small>Remplissez les conditions : le contrat est créé avec les informations de l’entreprise (matricule fiscal, adresse…).</small>
              </button>
              <button type="button" role="radio" aria-checked={source === "IMPORT"} className={source === "IMPORT" ? "is-on" : ""} onClick={() => setSource("IMPORT")}>
                <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
                <strong>Importer mon PDF</strong>
                <small>Vous avez déjà votre propre contrat : ajoutez-le en PDF (10 Mo maximum).</small>
              </button>
            </div>
            {source === "TEMPLATE" ? (
              <p className="pcd-note">
                Le modèle juridique n’est pas encore validé. Le PDF généré est préparatoire et ne constitue pas un contrat opposable.
              </p>
            ) : null}
            <div className="fiche-actions pcd-sticky">
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
              <select className="custom-input" value={terms.contractType} onChange={(event) => setTerms({ ...terms, contractType: event.target.value })}>
                <option value="">Choisir…</option>
                {CONTRACT_TYPES.map((type) => (
                  <option key={type.value} value={type.label}>
                    {type.label}
                  </option>
                ))}
              </select>
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
              <input className="custom-input" type="date" min={new Date().toISOString().slice(0, 10)} value={terms.startDate} onChange={(event) => setTerms({ ...terms, startDate: event.target.value })} />
            </label>
            <label className="fu-field">
              Lieu
              <input className="custom-input" value={terms.location} onChange={(event) => setTerms({ ...terms, location: event.target.value })} />
            </label>
            <label className="fu-field">
              Informations complémentaires
              <textarea className="custom-input custom-textarea" value={terms.extra} onChange={(event) => setTerms({ ...terms, extra: event.target.value })} />
            </label>
            <div className="fiche-actions pcd-sticky">
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
            <div className="fiche-actions pcd-sticky">
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
            <div className="fiche-actions pcd-sticky">
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
