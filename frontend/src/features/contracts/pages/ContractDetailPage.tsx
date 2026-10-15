import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import { formatPipelineDate, updateRecruitmentStatus } from "@/features/recruitment/api";
import {
  contractError,
  contractStatusLabel,
  contractStatusTone,
  fetchCandidateDocument,
  fetchContract,
  fetchContractDocument,
  fetchContractHistory,
  historyLabel,
  signContract,
  uploadCandidateSigned,
  type Contract,
  type ContractHistory,
} from "../api";

function formatWhen(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContractDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [history, setHistory] = useState<ContractHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const candidate = isCandidate(user);
  const employer = isBusiness(user);

  useEffect(() => {
    if (!id || (!candidate && !employer)) {
      return;
    }
    Promise.all([fetchContract(id), fetchContractHistory(id)])
      .then(([item, events]) => {
        setContract(item);
        setHistory(events);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? contractError(err.message) : "Impossible de charger le contrat."));
  }, [id, candidate, employer]);

  if (!candidate && !employer) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (!id) {
    return <Navigate to="/contracts" replace />;
  }

  async function openPdf(signed: boolean) {
    if (!contract) {
      return;
    }
    const blob = await fetchContractDocument(contract.id, signed);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function downloadPdf(kind: "original" | "candidate" | "signed") {
    if (!contract) {
      return;
    }
    const blob =
      kind === "candidate" ? await fetchCandidateDocument(contract.id) : await fetchContractDocument(contract.id, kind === "signed");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kind === "original" ? `contrat-${contract.id}.pdf` : `contrat-signe-${contract.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function sendSigned(file: File | null | undefined) {
    if (!contract || !file) {
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ce fichier est trop volumineux (10 Mo maximum).");
      return;
    }
    setBusy(true);
    try {
      const updated = await uploadCandidateSigned(contract.id, file);
      setContract(updated);
      setHistory(await fetchContractHistory(updated.id));
      setFlash("Contrat signé envoyé à l’employeur.");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Le fichier n’a pas pu être envoyé.");
    } finally {
      setBusy(false);
    }
  }

  async function sign() {
    if (!contract) {
      return;
    }
    setBusy(true);
    try {
      const updated = await signContract(contract.id);
      setContract(updated);
      setHistory(await fetchContractHistory(updated.id));
      setFlash("Signature enregistrée.");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "La signature n’a pas pu être enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  async function markHired() {
    if (!contract) {
      return;
    }
    setBusy(true);
    try {
      await updateRecruitmentStatus(contract.recruitmentId, "HIRED");
      setFlash("Candidat marqué comme recruté.");
      navigate("/applications");
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Impossible de marquer ce candidat comme recruté.");
    } finally {
      setBusy(false);
    }
  }

  const canSign =
    contract &&
    (contract.status === "SENT" || contract.status === "CANDIDATE_SIGNED" || contract.status === "EMPLOYER_SIGNED") &&
    employer &&
    !contract.employerSignedAt;
  const candidateMustSign =
    candidate &&
    contract &&
    (contract.status === "SENT" || contract.status === "EMPLOYER_SIGNED") &&
    !contract.candidateSignedAt;
  const position = contract?.jobOffer?.title || contract?.terms?.position || "Recrutement direct";

  return (
    <section className="contract-detail">
      <Link className="contract-back" to="/contracts">
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
        Retour aux contrats
      </Link>
      {error ? <p className="auth-error">{error}</p> : null}
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {!contract ? (
        <p className="empty-hint">Chargement du contrat…</p>
      ) : (
        <>
          <div className="page-head">
            <div>
              <h1>{contract.title}</h1>
              <p className="sub">
                {contract.candidateName} · {position}
              </p>
            </div>
            <StatusPill tone={contractStatusTone(contract.status)}>{contractStatusLabel(contract.status)}</StatusPill>
          </div>

          <div className="jobs-layout">
            <Panel title="Informations">
              <div className="info-grid">
                <div className="info-cell">
                  <div className="k">Candidat</div>
                  <div className="v">{contract.candidateName}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Employeur</div>
                  <div className="v">{contract.employerName}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Poste</div>
                  <div className="v">{position}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Créé le</div>
                  <div className="v">{formatPipelineDate(contract.createdAt)}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Envoyé le</div>
                  <div className="v">{contract.sentAt ? formatPipelineDate(contract.sentAt) : "—"}</div>
                </div>
                <div className="info-cell">
                  <div className="k">Source</div>
                  <div className="v">{contract.source === "IMPORT" ? "PDF importé" : "Modèle de contrat"}</div>
                </div>
              </div>
              {contract.templateNotice ? <p className="empty-hint">{contract.templateNotice}</p> : null}
            </Panel>

            {candidateMustSign ? (
              <Panel title="À faire : signer votre contrat" body>
                <ol className="sgx-steps">
                  <li>
                    <span className="sgx-n">1</span>
                    <div>
                      <strong>Téléchargez le contrat</strong>
                      <p>Lisez-le attentivement, puis imprimez-le ou ouvrez-le dans un outil de signature.</p>
                      <Button variant="outline" type="button" onClick={() => void downloadPdf("original")}>
                        Télécharger le PDF
                      </Button>
                    </div>
                  </li>
                  <li>
                    <span className="sgx-n">2</span>
                    <div>
                      <strong>Signez-le</strong>
                      <p>Signature à la main puis scan ou photo en PDF, ou signature électronique de votre choix.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sgx-n">3</span>
                    <div>
                      <strong>Renvoyez le PDF signé</strong>
                      <div
                        className={dragOver ? "sgx-drop is-over" : "sgx-drop"}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDragOver(false);
                          void sendSigned(event.dataTransfer.files[0]);
                        }}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
                        <p>{busy ? "Envoi en cours…" : "Glissez le PDF signé ici (10 Mo maximum)"}</p>
                        <button type="button" className="sgx-pick" disabled={busy} onClick={() => fileInput.current?.click()}>
                          Choisir le fichier
                        </button>
                        <input
                          ref={fileInput}
                          type="file"
                          accept="application/pdf,.pdf"
                          hidden
                          onChange={(event) => {
                            void sendSigned(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </li>
                </ol>
              </Panel>
            ) : null}

            <Panel title="Signatures" body>
              <div className="sign-list">
                <div className={`sign-step${contract.candidateSignedAt ? " is-done" : ""}`}>
                  <span className="sign-mark material-symbols-outlined" aria-hidden="true">
                    {contract.candidateSignedAt ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <div>
                    <strong>Candidat</strong>
                    <p>{contract.candidateSignedAt ? `Signé le ${formatWhen(contract.candidateSignedAt)}` : "Signature en attente"}</p>
                  </div>
                </div>
                <div className={`sign-step${contract.employerSignedAt ? " is-done" : ""}`}>
                  <span className="sign-mark material-symbols-outlined" aria-hidden="true">
                    {contract.employerSignedAt ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <div>
                    <strong>Employeur</strong>
                    <p>{contract.employerSignedAt ? `Signé le ${formatWhen(contract.employerSignedAt)}` : "Signature en attente"}</p>
                  </div>
                </div>
              </div>
              {contract.status === "COMPLETED" ? <p className="sign-complete">Contrat finalisé des deux côtés.</p> : null}
              <div className="jobs-actions">
                <Button variant="outline" type="button" onClick={() => void openPdf(false)}>
                  Voir le contrat
                </Button>
                <Button variant="outline" type="button" onClick={() => void downloadPdf("original")}>
                  Télécharger
                </Button>
                {contract.candidateUploadId ? (
                  <Button variant="outline" type="button" onClick={() => void downloadPdf("candidate")}>
                    {employer ? "Exemplaire signé du candidat" : "Mon exemplaire signé"}
                  </Button>
                ) : null}
                {contract.signedUploadId && contract.signedUploadId !== contract.candidateUploadId ? (
                  <Button variant="outline" type="button" onClick={() => void downloadPdf("signed")}>
                    Télécharger le PDF final
                  </Button>
                ) : null}
                {canSign ? (
                  <Button variant="primary" type="button" disabled={busy} onClick={() => void sign()}>
                    {busy ? "Signature…" : contract.candidateUploadId ? "Signer et finaliser" : "Signer le contrat"}
                  </Button>
                ) : null}
                {employer && contract.status === "COMPLETED" ? (
                  <Button variant="primary" type="button" disabled={busy} onClick={() => void markHired()}>
                    Marquer comme recruté
                  </Button>
                ) : null}
              </div>
            </Panel>
          </div>

          <Panel title="Historique">
            {history.length === 0 ? (
              <p className="jobs-empty">
                <strong>Aucun événement</strong>
                <span>L’historique de ce contrat est vide.</span>
              </p>
            ) : (
              <ol className="contract-timeline">
                {history.map((event) => (
                  <li key={event.id}>
                    <span className="contract-timeline-dot" />
                    <div>
                      <strong>{historyLabel(event.event)}</strong>
                      <time dateTime={event.createdAt}>{formatWhen(event.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </>
      )}
    </section>
  );
}
