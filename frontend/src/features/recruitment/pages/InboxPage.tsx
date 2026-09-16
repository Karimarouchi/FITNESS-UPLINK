import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { can, useBilling } from "@/features/billing/useBilling";
import { StatusPill } from "@/components/ui/StatusPill";
import { ApiError } from "@/shared/api/client";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { HireThread, canMessage } from "../HireThread";
import { InterviewScheduleForm, type InterviewDraft } from "../InterviewScheduleForm";
import { PipelineBoard } from "../PipelineBoard";
import { openHireChat } from "../openHireChat";
import {
  blockRecruitment,
  updateRecruitmentStatus,
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  pipelineTone,
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
  const [items, setItems] = useState<Recruitment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [open, setOpen] = useState<Recruitment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [interviewFor, setInterviewFor] = useState<Recruitment | null>(null);

  useEffect(() => {
    fetchRecruitments()
      .then((list) => setItems(list.filter((row) => row.status !== "REJECTED" && row.status !== "ARCHIVED")))
      .catch(() => setError("Impossible de charger les candidatures."));
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

  async function changeStatus(item: Recruitment, status: PipelineStatus, interview?: InterviewDraft) {
    if (status === "INTERVIEW_SCHEDULED" && !interview) {
      setInterviewFor(item);
      return;
    }
    const previous = item.status;
    replace({ ...item, status });
    try {
      const updated = await updateRecruitmentStatus(item.id, status, interview);
      replace(updated);
      setInterviewFor(null);
      setFlash(`Étape : ${statusLabel(status)}.`);
    } catch (err) {
      replace({ ...item, status: previous });
      setFlash(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de changer l’étape.");
    }
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
        {waiting.length ? <span className="hire-count">{waiting.length}</span> : null}
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? <p className="empty-hint">Aucune candidature pour le moment.</p> : null}

      {waiting.length ? (
        <>
          <h2 className="hire-section-title">À recruter</h2>
          <div className="hire-grid">
            {waiting.map((item) => (
              <ApplicationCard
                key={item.id}
                item={item}
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
          <h2 className="hire-section-title">En cours</h2>
          <div className="hire-grid">
            {active.map((item) => (
              <ApplicationCard
                key={item.id}
                item={item}
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

      {interviewFor ? (
        <div className="fu-backdrop hire-stage-overlay" role="presentation" onClick={() => setInterviewFor(null)}>
          <div className="hire-stage-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <InterviewScheduleForm
              candidateName={interviewFor.candidate.displayName}
              onCancel={() => setInterviewFor(null)}
              onConfirm={(draft) => void changeStatus(interviewFor, "INTERVIEW_SCHEDULED", draft)}
            />
          </div>
        </div>
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
            <p className="hire-stage-hint">Glissez la carte d’une colonne à l’autre pour changer l’étape.</p>
            <div className="hire-stage-body">
              <PipelineBoard items={[open]} onOpen={() => undefined} onStatus={changeStatus} />
              {canMessage(open.status) ? <HireThread recruitmentId={open.id} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ApplicationCard({
  item,
  busy,
  canContact,
  canPipeline,
  onContact,
  onBlock,
  onPipeline,
}: {
  item: Recruitment;
  busy: boolean;
  canContact: boolean;
  canPipeline: boolean;
  onContact: () => void;
  onBlock: () => void;
  onPipeline: () => void;
}) {
  const recruit = needsRecruit(item.status);
  return (
    <article className="hire-card hire-card--dossier">
      <CandidatePhoto
        candidateId={item.candidate.id}
        uploadId={item.candidate.photoUploadId}
        name={item.candidate.displayName}
        size={56}
      />
      <div className="hire-card-copy">
        <strong>{item.candidate.displayName}</strong>
        <p>{opportunityLabel(item)}</p>
        <p className="text-on-surface-variant">{formatPipelineDate(item.createdAt)}</p>
        <StatusPill tone={pipelineTone(item.status)}>{statusLabel(item.status)}</StatusPill>
      </div>
      <div className="hire-card-actions">
        <Button variant="outline" to={`/candidates/${item.candidate.id}`}>
          Voir le profil
        </Button>
        {canContact ? (
          <Button variant="primary" type="button" disabled={busy} onClick={onContact}>
            {busy ? "…" : "Contacter"}
          </Button>
        ) : (
          <Button variant="outline" to="/app/profile/plan">
            Débloquer Contacter
          </Button>
        )}
        {!recruit && canPipeline ? (
          <Button variant="outline" type="button" onClick={onPipeline}>
            Pipeline
          </Button>
        ) : null}
        {canPipeline ? (
          <Button variant="danger" type="button" disabled={busy} onClick={onBlock}>
            Bloquer
          </Button>
        ) : null}
      </div>
    </article>
  );
}
