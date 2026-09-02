import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import { fetchJobOffers, type JobOffer } from "@/features/jobs/api";
import { PrepareContractDrawer } from "@/features/contracts/PrepareContractDrawer";
import { PipelineBoard } from "../PipelineBoard";
import { PipelineCandidateCard } from "../PipelineCandidateCard";
import { PipelineDrawer } from "../PipelineDrawer";
import { PipelineFilters, parseOfferFilter } from "../PipelineFilters";
import { StartRecruitmentModal } from "../StartRecruitmentModal";
import {
  BOARD_COLUMNS,
  PIPELINE_STATUSES,
  archiveRecruitment,
  fetchRecruitment,
  fetchRecruitments,
  recruitmentError,
  statusLabel,
  updateRecruitmentNote,
  updateRecruitmentStatus,
  type PipelineStatus,
  type Recruitment,
} from "../api";

export function PipelinePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Recruitment[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [offerFilter, setOfferFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [mobileStatus, setMobileStatus] = useState<PipelineStatus>("NEW");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [selected, setSelected] = useState<Recruitment | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [startFor, setStartFor] = useState<Recruitment | null>(null);
  const [contactPrompt, setContactPrompt] = useState<Recruitment | null>(null);
  const [prepareFor, setPrepareFor] = useState<Recruitment | null>(null);
  const [confirmPrepare, setConfirmPrepare] = useState<Recruitment | null>(null);

  const filters = useMemo(() => parseOfferFilter(offerFilter), [offerFilter]);

  useEffect(() => {
    fetchJobOffers().then(setOffers).catch(() => setOffers([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchRecruitments({
        ...filters,
        status: (statusFilter || undefined) as PipelineStatus | undefined,
        q: query,
      })
        .then((list) => {
          if (!cancelled) {
            setItems(list);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de charger le pipeline.");
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters, statusFilter, query]);

  if (!isBusiness(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  function replaceItem(updated: Recruitment) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelected((current) => (current?.id === updated.id ? updated : current));
  }

  async function changeStatus(item: Recruitment, status: PipelineStatus) {
    if (status === "CONTRACT_SENT") {
      setConfirmPrepare(item);
      return;
    }
    const previous = item.status;
    replaceItem({ ...item, status });
    try {
      const updated = await updateRecruitmentStatus(item.id, status);
      replaceItem(updated);
      setFlash(`Statut de ${updated.candidate.displayName} mis à jour : ${statusLabel(status)}.`);
    } catch (err) {
      replaceItem({ ...item, status: previous });
      setFlash(err instanceof ApiError ? recruitmentError(err.message) : "Le statut n’a pas pu être mis à jour.");
    }
  }

  function openPrepare(item: Recruitment) {
    setSelected(null);
    setConfirmPrepare(null);
    setPrepareFor(item);
  }

  function viewContract(item: Recruitment) {
    if (item.contract?.id) {
      navigate(`/contracts/${item.contract.id}`);
    }
  }

  function openItem(item: Recruitment) {
    setSelected(item);
    setNoteDraft(item.internalNote ?? "");
  }

  async function saveNote() {
    if (!selected) {
      return;
    }
    try {
      const updated = await updateRecruitmentNote(selected.id, noteDraft);
      replaceItem(updated);
      setFlash("Note interne enregistrée.");
    } catch {
      setFlash("Impossible d’enregistrer la note.");
    }
  }

  async function archive() {
    if (!selected) {
      return;
    }
    try {
      const updated = await archiveRecruitment(selected.id);
      replaceItem(updated);
      setFlash(`${updated.candidate.displayName} a été archivé.`);
      setSelected(null);
    } catch {
      setFlash("Impossible d’archiver ce recrutement.");
    }
  }

  function contact(item: Recruitment) {
    window.location.href = `mailto:${item.candidate.email}`;
    if (item.status === "NEW") {
      setContactPrompt(item);
    }
  }

  const mobileItems = items.filter((item) => item.status === mobileStatus);
  const exitItems = items.filter((item) => item.status === "REJECTED" || item.status === "ARCHIVED");

  return (
    <section className="pipeline-page">
      <div className="talent-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1 className="font-display-lg-mobile text-primary">Pipeline de recrutement</h1>
        </div>
      </div>
      <PipelineFilters
        offers={offers}
        offerFilter={offerFilter}
        statusFilter={statusFilter}
        query={query}
        onOfferFilter={setOfferFilter}
        onStatusFilter={setStatusFilter}
        onQuery={setQuery}
      />
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? (
        <div className="fu-empty">
          <p>Aucun candidat dans ce pipeline.</p>
          <Link className="ob-primary" to="/candidates">
            Rechercher des talents
          </Link>
        </div>
      ) : (
        <>
          <div className="pipeline-desktop">
            <PipelineBoard
              items={items.filter((item) => BOARD_COLUMNS.includes(item.status))}
              onOpen={openItem}
              onStatus={changeStatus}
              onPrepareContract={openPrepare}
              onViewContract={viewContract}
              onMarkHired={(item) => void changeStatus(item, "HIRED")}
            />
            {statusFilter === "REJECTED" || statusFilter === "ARCHIVED" || exitItems.length ? (
              <div className="pipeline-exit">
                <h2>Refusé / Archivé</h2>
                <div className="pipeline-exit-list">
                  {exitItems.map((item) => (
                    <PipelineCandidateCard
                      key={item.id}
                      item={item}
                      onOpen={() => openItem(item)}
                      onStatus={(status) => void changeStatus(item, status)}
                      onPrepareContract={() => openPrepare(item)}
                      onViewContract={() => viewContract(item)}
                      onMarkHired={() => void changeStatus(item, "HIRED")}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="pipeline-mobile">
            <label className="fu-field">
              Statut
              <select className="custom-input" value={mobileStatus} onChange={(event) => setMobileStatus(event.target.value as PipelineStatus)}>
                {PIPELINE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            {mobileItems.length === 0 ? (
              <p className="text-on-surface-variant">Aucun candidat dans ce statut.</p>
            ) : (
              mobileItems.map((item) => (
                <PipelineCandidateCard
                  key={item.id}
                  item={item}
                  onOpen={() => openItem(item)}
                  onStatus={(status) => void changeStatus(item, status)}
                  onPrepareContract={() => openPrepare(item)}
                  onViewContract={() => viewContract(item)}
                  onMarkHired={() => void changeStatus(item, "HIRED")}
                />
              ))
            )}
          </div>
        </>
      )}
      {selected ? (
        <PipelineDrawer
          item={selected}
          noteDraft={noteDraft}
          onNoteDraft={setNoteDraft}
          onClose={() => setSelected(null)}
          onStatus={(status) => void changeStatus(selected, status)}
          onSaveNote={() => void saveNote()}
          onArchive={() => void archive()}
          onContact={() => contact(selected)}
          onNewRecruitment={() => setStartFor(selected)}
          onPrepareContract={() => openPrepare(selected)}
          onViewContract={() => viewContract(selected)}
          onMarkHired={() => void changeStatus(selected, "HIRED")}
        />
      ) : null}
      {startFor ? (
        <StartRecruitmentModal
          candidateId={startFor.candidate.id}
          candidateName={startFor.candidate.displayName}
          onClose={() => setStartFor(null)}
          onStarted={(entry) => {
            setItems((current) => [entry, ...current]);
            setStartFor(null);
            setFlash(`${entry.candidate.displayName} a été ajoutée à votre pipeline de recrutement.`);
          }}
        />
      ) : null}
      {contactPrompt ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setContactPrompt(null)}>
          <div className="fu-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <p>
              {contactPrompt.candidate.displayName} est actuellement au statut Nouveau. Voulez-vous le passer à Contacté ?
            </p>
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" onClick={() => setContactPrompt(null)}>
                Non
              </button>
              <button
                className="ob-primary"
                type="button"
                onClick={() => {
                  void changeStatus(contactPrompt, "CONTACTED");
                  setContactPrompt(null);
                }}
              >
                Passer à Contacté
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmPrepare ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setConfirmPrepare(null)}>
          <div className="fu-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-headline-md text-primary">Préparer le contrat</h2>
            <p>
              Vous devez créer ou importer un contrat avant de pouvoir passer {confirmPrepare.candidate.displayName} au
              statut « Contrat envoyé ».
            </p>
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" onClick={() => setConfirmPrepare(null)}>
                Annuler
              </button>
              <button className="ob-primary" type="button" onClick={() => openPrepare(confirmPrepare)}>
                Préparer le contrat
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {prepareFor ? (
        <PrepareContractDrawer
          item={prepareFor}
          employerName={user?.displayName || "Employeur"}
          onClose={() => setPrepareFor(null)}
          onSent={(updated) => {
            void fetchRecruitment(updated.id)
              .then((fresh) => {
                replaceItem(fresh);
                setFlash(`Contrat envoyé à ${fresh.candidate.displayName}.`);
              })
              .catch(() => replaceItem(updated));
            setPrepareFor(null);
          }}
        />
      ) : null}
    </section>
  );
}
