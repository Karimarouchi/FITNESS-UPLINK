import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { can, useBilling } from "@/features/billing/useBilling";
import { ApiError } from "@/shared/api/client";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { HireThread, canMessage } from "../HireThread";
import type { InterviewDraft } from "../InterviewScheduleForm";
import { PipelineStepper } from "../PipelineStepper";
import { PrepareContractDrawer } from "@/features/contracts/PrepareContractDrawer";
import type { ContractTerms } from "@/features/contracts/api";
import { openHireChat } from "../openHireChat";
import {
  blockRecruitment,
  fetchNegotiation,
  updateRecruitmentStatus,
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  recruitmentError,
  statusLabel,
  type PipelineStatus,
  type Recruitment,
} from "../api";

function needsRecruit(status: PipelineStatus) {
  return status === "APPLIED" || status === "NEW";
}

export function InboxPage() {
  const billing = useBilling();
  const canContact = can(billing, "hire.contact");
  const canPipeline = can(billing, "hire.pipeline");
  const canContracts = can(billing, "hire.contracts");
  const [items, setItems] = useState<Recruitment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [open, setOpen] = useState<Recruitment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contractFor, setContractFor] = useState<{ item: Recruitment; terms: Partial<ContractTerms>; draftId?: string } | null>(null);

  useEffect(() => {
    fetchRecruitments()
      .then((list) => setItems(list.filter((row) => row.status !== "REJECTED" && row.status !== "ARCHIVED")))
      .catch(() => setError("Impossible de charger les candidatures."))
      .finally(() => setLoading(false));
  }, []);

  function replace(updated: Recruitment) {
    setItems((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    setOpen((current) => (current?.id === updated.id ? updated : current));
  }

  async function contact(item: Recruitment) {
    setBusyId(item.id);
    try {
      const updated = needsRecruit(item.status) ? await updateRecruitmentStatus(item.id, "CONTACTED") : item;
      replace(updated);
      openHireChat({
        id: updated.id,
        peerName: updated.candidate.displayName,
        title: opportunityLabel(updated),
      });
      setFlash(`${updated.candidate.displayName} : discussion ouverte.`);
    } catch (err) {
      setFlash(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de contacter ce candidat.");
    } finally {
      setBusyId(null);
    }
  }

  async function block(item: Recruitment) {
    setBusyId(item.id);
    try {
      await blockRecruitment(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setOpen((current) => (current?.id === item.id ? null : current));
      setFlash(`${item.candidate.displayName} a été bloqué. Statut : Refusé.`);
    } catch (err) {
      setFlash(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de bloquer ce contact.");
    } finally {
      setBusyId(null);
    }
  }

  /** Returns an error message to show inside the modal, or null when the step changed. */
  async function changeStatus(item: Recruitment, status: PipelineStatus, interview?: InterviewDraft): Promise<string | null> {
    try {
      const updated = await updateRecruitmentStatus(item.id, status, interview);
      replace(updated);
      setFlash(
        status === "INTERVIEW_SCHEDULED"
          ? `Entretien enregistré. ${updated.candidate.displayName} a été prévenu.`
          : `Étape : ${statusLabel(status)}.`,
      );
      return null;
    } catch (err) {
      return err instanceof ApiError ? recruitmentError(err.message) : "Impossible de changer l’étape.";
    }
  }

  /** Opens the contract screen, prefilled with the last accepted proposal when there is one. */
  async function prepareContract(item: Recruitment) {
    let terms: Partial<ContractTerms> = {};
    if (item.contract?.status === "DRAFT") {
      setContractFor({ item, terms, draftId: item.contract.id });
      return;
    }
    try {
      const offers = await fetchNegotiation(item.id);
      const agreed = [...offers].reverse().find((offer) => offer.status === "ACCEPTED");
      if (agreed) {
        terms = {
          contractType: agreed.contractType,
          salaryAmount: String(agreed.salaryAmount),
          salaryCurrency: agreed.salaryCurrency,
          startDate: agreed.startDate ?? "",
          location: agreed.location ?? item.jobOffer?.location ?? "",
          extra: agreed.note ?? "",
        };
        const label = ({ cdi: "CDI", cdd: "CDD", freelance: "Freelance", part_time: "Temps partiel", internship: "Stage", vacation: "Vacation" } as Record<string, string>)[agreed.contractType];
        terms.contractType = label ?? agreed.contractType;
      }
    } catch {
      /* no negotiation history: start from the offer */
    }
    setContractFor({ item, terms });
  }

  const waiting = items.filter((item) => needsRecruit(item.status));
  const active = items.filter((item) => !needsRecruit(item.status));

  return (
    <section className="hire-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Candidatures</h1>
          <p className="sub">Contacter ouvre la discussion. Recruter d’abord si le dossier est nouveau. Pipeline change les étapes.</p>
        </div>
        {waiting.length ? (
          <span className="dsx-badge">
            <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
            {waiting.length} à examiner
          </span>
        ) : null}
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {loading ? (
        <div className="dsx-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="tlx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="tlx-sk tlx-sk-avatar" />
              <span className="tlx-sk tlx-sk-line" />
              <span className="tlx-sk tlx-sk-line is-short" />
            </div>
          ))}
        </div>
      ) : null}
      {!loading && items.length === 0 && !error ? (
        <div className="tlx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">inbox</span>
          <strong>Aucune candidature</strong>
          <p>Les candidatures à vos offres et vos recrutements en cours apparaîtront ici.</p>
          <Link className="tlx-btn is-primary" to="/job-offers">
            Gérer mes offres
          </Link>
        </div>
      ) : null}

      {waiting.length ? (
        <>
          <h2 className="dsx-title">À recruter <b>{waiting.length}</b></h2>
          <div className="dsx-grid">
            {waiting.map((item, index) => (
              <ApplicationCard
                key={item.id}
                item={item}
                index={index}
                busy={busyId === item.id}
                canContact={canContact}
                canPipeline={canPipeline}
                onContact={() => void contact(item)}
                onBlock={() => void block(item)}
                onPipeline={() => setOpen(item)}
              />
            ))}
          </div>
        </>
      ) : null}

      {active.length ? (
        <>
          <h2 className="dsx-title">En cours <b>{active.length}</b></h2>
          <div className="dsx-grid">
            {active.map((item, index) => (
              <ApplicationCard
                key={item.id}
                item={item}
                index={index}
                busy={busyId === item.id}
                canContact={canContact}
                canPipeline={canPipeline}
                onContact={() => void contact(item)}
                onBlock={() => void block(item)}
                onPipeline={() => setOpen(item)}
              />
            ))}
          </div>
        </>
      ) : null}

      {open ? (
        <div className="fu-backdrop hire-stage-overlay" role="presentation" onClick={() => setOpen(null)}>
          <div className="hire-stage-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="hire-stage-head">
              <div>
                <p className="font-label-caps uppercase text-on-surface-variant">Étapes</p>
                <h2>{open.candidate.displayName}</h2>
                <p className="text-on-surface-variant">{opportunityLabel(open)}</p>
              </div>
              <button className="ob-secondary" type="button" onClick={() => setOpen(null)}>
                Fermer
              </button>
            </div>
            <p className="hire-stage-hint">Cliquez sur une étape, puis confirmez. Pour un entretien, indiquez la date, l’heure et le lien.</p>
            <div className="hire-stage-body">
              <PipelineStepper item={open} onStatus={changeStatus} onPrepareContract={() => void prepareContract(open)} contractLocked={billing !== null && !canContracts} />
              {canMessage(open.status) ? <HireThread recruitmentId={open.id} /> : null}
            </div>
          </div>
        </div>
      ) : null}
      {contractFor ? (
        <PrepareContractDrawer
          item={contractFor.item}
          employerName={contractFor.item.employer?.displayName ?? "Employeur"}
          initialTerms={contractFor.terms}
          draftId={contractFor.draftId}
          onClose={() => setContractFor(null)}
          onSent={(updated) => {
            replace({ ...contractFor.item, ...updated });
            setContractFor(null);
            setFlash("Contrat envoyé pour signature. Le candidat a été prévenu.");
          }}
        />
      ) : null}
    </section>
  );
}

function ApplicationCard({
  item,
  index,
  busy,
  canContact,
  canPipeline,
  onContact,
  onBlock,
  onPipeline,
}: {
  item: Recruitment;
  index: number;
  busy: boolean;
  canContact: boolean;
  canPipeline: boolean;
  onContact: () => void;
  onBlock: () => void;
  onPipeline: () => void;
}) {
  const recruit = needsRecruit(item.status);
  return (
    <article className={recruit ? "tlx-card dsx-card is-new" : "tlx-card dsx-card"} style={{ "--i": index } as CSSProperties}>
      <div className="tlx-head">
        <div className="tlx-avatar">
          <CandidatePhoto
            candidateId={item.candidate.id}
            uploadId={item.candidate.photoUploadId}
            name={item.candidate.displayName}
            size={64}
          />
        </div>
        <div className="tlx-id">
          <h3 className="tlx-name">
            {item.candidate.displayName}
            {item.candidate.verified ? (
              <span className="tlx-verified material-symbols-outlined" title="Compte vérifié" aria-label="Compte vérifié">
                verified
              </span>
            ) : null}
          </h3>
          <p className="tlx-title">{opportunityLabel(item)}</p>
        </div>
        <span className={recruit ? "pdx-pill" : "pdx-pill is-muted"}>{statusLabel(item.status)}</span>
      </div>

      <ul className="tlx-facts">
        <li>
          <span className="material-symbols-outlined" aria-hidden="true">calendar_today</span>
          Reçue le {formatPipelineDate(item.createdAt)}
        </li>
        {item.status === "INTERVIEW_SCHEDULED" && item.interviewAt ? (
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">event</span>
            Entretien le {new Date(item.interviewAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </li>
        ) : null}
      </ul>

      <div className="dsx-actions">
        <Link className="tlx-btn" to={`/candidates/${item.candidate.id}`}>
          <span className="material-symbols-outlined" aria-hidden="true">person</span>
          Profil
        </Link>
        {canContact ? (
          <button className="tlx-btn is-primary" type="button" disabled={busy} onClick={onContact}>
            <span className="material-symbols-outlined" aria-hidden="true">chat</span>
            {busy ? "…" : "Contacter"}
          </button>
        ) : (
          <Link className="tlx-btn" to="/app/profile/plan">
            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
            Débloquer Contacter
          </Link>
        )}
        {!recruit && canPipeline ? (
          <button className="tlx-btn" type="button" onClick={onPipeline}>
            <span className="material-symbols-outlined" aria-hidden="true">account_tree</span>
            Pipeline
          </button>
        ) : null}
        {canPipeline ? (
          <button className="tlx-btn is-danger" type="button" disabled={busy} onClick={onBlock}>
            <span className="material-symbols-outlined" aria-hidden="true">block</span>
            Bloquer
          </button>
        ) : null}
      </div>
    </article>
  );
}
