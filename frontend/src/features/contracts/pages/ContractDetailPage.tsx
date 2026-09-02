import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import { updateRecruitmentStatus } from "@/features/recruitment/api";
import {
  contractError,
  contractStatusLabel,
  fetchContract,
  fetchContractDocument,
  fetchContractHistory,
  historyLabel,
  signContract,
  type Contract,
  type ContractHistory,
} from "../api";

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
    return <Navigate to="/" replace />;
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

  return (
    <section className="talent-page">
      <Link className="ob-link fiche-back" to="/contracts">
        Retour aux contrats
      </Link>
      {error ? <p className="auth-error">{error}</p> : null}
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {!contract ? (
        <p className="font-body-md text-on-surface-variant">Chargement…</p>
      ) : (
        <>
          <p className="font-label-caps uppercase text-on-surface-variant">Contrat</p>
          <h1 className="font-display-lg-mobile text-primary mb-4">{contract.title}</h1>
          <p>Candidat : {contract.candidateName}</p>
          <p>Employeur : {contract.employerName}</p>
          <p>Poste : {contract.jobOffer?.title || contract.terms?.position || "Recrutement direct"}</p>
          <p>
            Statut : <strong>{contractStatusLabel(contract.status)}</strong>
          </p>
          {contract.templateNotice ? <p className="talent-meta">{contract.templateNotice}</p> : null}
          <div className="pipeline-contract-state">
            <p>{contract.candidateSignedAt ? "✓ Candidat signé" : "○ Signature candidat en attente"}</p>
            <p>{contract.employerSignedAt ? "✓ Employeur signé" : "○ Signature employeur en attente"}</p>
            {contract.status === "COMPLETED" ? <p>✓ Contrat finalisé</p> : null}
          </div>
          <div className="fiche-actions">
            <button className="ob-secondary" type="button" onClick={() => void openPdf(false)}>
              Voir le contrat
            </button>
            {contract.signedUploadId ? (
              <button className="ob-secondary" type="button" onClick={() => void openPdf(true)}>
                Télécharger le PDF
              </button>
            ) : null}
            {canSign ? (
              <button className="ob-primary" type="button" disabled={busy} onClick={() => void sign()}>
                {busy ? "Signature…" : "Signer le contrat"}
              </button>
            ) : null}
            {employer && contract.status === "COMPLETED" ? (
              <button className="ob-primary" type="button" disabled={busy} onClick={() => void markHired()}>
                Marquer comme recruté
              </button>
            ) : null}
          </div>
          <h2 className="font-headline-md text-primary mt-8 mb-3">Historique</h2>
          <ul className="fiche-list">
            {history.map((event) => (
              <li key={event.id}>
                {new Date(event.createdAt).toLocaleString("fr-FR")} — {historyLabel(event.event)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
