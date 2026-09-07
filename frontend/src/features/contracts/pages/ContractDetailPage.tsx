import { useEffect, useState } from "react";
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
  fetchContract,
  fetchContractDocument,
  fetchContractHistory,
  historyLabel,
  signContract,
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
      navigate("/pipeline");
    } catch (err) {
      setError(err instanceof ApiError ? contractError(err.message) : "Impossible de marquer ce candidat comme recruté.");
    } finally {
      setBusy(false);
    }
  }

  const canSign =
    contract &&
    (contract.status === "SENT" || contract.status === "CANDIDATE_SIGNED" || contract.status === "EMPLOYER_SIGNED") &&
    ((candidate && !contract.candidateSignedAt) || (employer && !contract.employerSignedAt));
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
                {contract.signedUploadId ? (
                  <Button variant="outline" type="button" onClick={() => void openPdf(true)}>
                    Télécharger le PDF
                  </Button>
                ) : null}
                {canSign ? (
                  <Button variant="primary" type="button" disabled={busy} onClick={() => void sign()}>
                    {busy ? "Signature…" : "Signer le contrat"}
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
