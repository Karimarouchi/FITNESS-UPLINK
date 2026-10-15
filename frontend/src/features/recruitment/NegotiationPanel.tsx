import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { CONTRACT_TYPES } from "@/features/jobs/api";
import {
  fetchNegotiation,
  negotiationError,
  proposeNegotiation,
  respondNegotiation,
  type NegotiationOffer,
} from "./api";

function contractLabel(value: string) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? value;
}

function money(offer: NegotiationOffer) {
  return `${Number(offer.salaryAmount).toLocaleString("fr-FR")} ${offer.salaryCurrency}`;
}

const STATUS_COPY: Record<NegotiationOffer["status"], string> = {
  PROPOSED: "En attente de réponse",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  SUPERSEDED: "Remplacée",
};

/**
 * Proposals exchanged during the NEGOTIATION step. `open` is false once the file leaves that
 * step: the history stays readable but nothing can be proposed or answered.
 */
export function NegotiationPanel({
  recruitmentId,
  open,
  role,
  defaults,
  onPrepareContract,
  contractLocked,
  contractDraft,
}: {
  recruitmentId: string;
  open: boolean;
  role: "EMPLOYER" | "CANDIDATE";
  onPrepareContract?: () => void;
  contractLocked?: boolean;
  contractDraft?: boolean;
  defaults?: { salary?: string | null; currency?: string | null; contractType?: string | null; location?: string | null };
}) {
  const [offers, setOffers] = useState<NegotiationOffer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [salary, setSalary] = useState(defaults?.salary ?? "");
  const [currency, setCurrency] = useState(defaults?.currency || "TND");
  const [contractType, setContractType] = useState(defaults?.contractType || "cdi");
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState(defaults?.location ?? "");
  const [note, setNote] = useState("");

  const load = useCallback(() => {
    fetchNegotiation(recruitmentId)
      .then(setOffers)
      .catch(() => setOffers([]));
  }, [recruitmentId]);

  useEffect(() => {
    setOffers(null);
    setComposing(false);
    setError(null);
    load();
  }, [load]);

  const pending = offers?.find((offer) => offer.status === "PROPOSED") ?? null;
  const agreed = offers?.find((offer) => offer.status === "ACCEPTED") ?? null;
  const waitingForMe = pending && !pending.mine;
  const waitingForOther = pending && pending.mine;

  function fail(err: unknown) {
    setError(err instanceof ApiError ? negotiationError(err.message) : "Action impossible.");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(String(salary).replace(",", "."));
    if (!amount || amount <= 0) {
      setError("Indiquez un salaire supérieur à 0.");
      return;
    }
    if (startDate && new Date(`${startDate}T23:59`).getTime() < Date.now()) {
      setError("La date de début ne peut pas être dans le passé.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await proposeNegotiation(recruitmentId, {
        salaryAmount: amount,
        salaryCurrency: currency,
        contractType,
        startDate: startDate || null,
        location: location.trim() || null,
        note: note.trim() || null,
      });
      setComposing(false);
      setNote("");
      load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function answer(offer: NegotiationOffer, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await respondNegotiation(recruitmentId, offer.id, accept);
      load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  function counter(offer: NegotiationOffer) {
    setSalary(String(offer.salaryAmount));
    setCurrency(offer.salaryCurrency);
    setContractType(offer.contractType);
    setStartDate(offer.startDate ?? "");
    setLocation(offer.location ?? "");
    setNote("");
    setComposing(true);
    setError(null);
  }

  if (offers === null) {
    return <div className="ngx"><div className="pdx-skeleton" /></div>;
  }

  return (
    <section className="ngx" aria-label="Négociation">
      <header>
        <h3>
          <span className="material-symbols-outlined" aria-hidden="true">handshake</span>
          Négociation
        </h3>
        {agreed ? <span className="ngx-agreed">Accord trouvé</span> : null}
      </header>

      {agreed ? (
        <div className="ngx-deal">
          <p>
            <b>{money(agreed)}</b> · {contractLabel(agreed.contractType)}
            {agreed.startDate ? ` · début le ${new Date(agreed.startDate).toLocaleDateString("fr-FR")}` : ""}
            {agreed.location ? ` · ${agreed.location}` : ""}
          </p>
          {role === "EMPLOYER" && open && contractLocked ? (
            <Link className="stepx-action ngx-contract" to="/app/profile/plan">
              Débloquer les contrats (offre Business)
              <span className="material-symbols-outlined" aria-hidden="true">lock_open</span>
            </Link>
          ) : role === "EMPLOYER" && open && onPrepareContract ? (
            <button type="button" className="stepx-action is-primary ngx-contract" onClick={onPrepareContract}>
              {contractDraft ? "Vérifier et envoyer le contrat" : "Préparer le contrat avec ces conditions"}
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </button>
          ) : role === "EMPLOYER" ? null : (
            <small>L’employeur peut maintenant vous envoyer le contrat.</small>
          )}
        </div>
      ) : null}

      {offers.length === 0 ? (
        <p className="ngx-empty">
          {open ? "Aucune proposition pour le moment. Envoyez la première pour lancer la discussion." : "Aucune proposition échangée."}
        </p>
      ) : (
        <ol className="ngx-list">
          {offers.map((offer) => (
            <li key={offer.id} className={`ngx-offer is-${offer.status.toLowerCase()}${offer.mine ? " is-mine" : ""}`}>
              <div className="ngx-offer-top">
                <strong>{offer.mine ? "Vous" : offer.proposerName}</strong>
                <span className="ngx-state">{STATUS_COPY[offer.status]}</span>
              </div>
              <p className="ngx-money">{money(offer)}</p>
              <p className="ngx-meta">
                {contractLabel(offer.contractType)}
                {offer.startDate ? ` · début le ${new Date(offer.startDate).toLocaleDateString("fr-FR")}` : ""}
                {offer.location ? ` · ${offer.location}` : ""}
              </p>
              {offer.note ? <p className="ngx-note">« {offer.note} »</p> : null}
              <small>{new Date(offer.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</small>
              {open && offer.status === "PROPOSED" && !offer.mine ? (
                <div className="ngx-answer">
                  <button type="button" className="stepx-action is-primary" disabled={busy} onClick={() => void answer(offer, true)}>
                    Accepter
                  </button>
                  <button type="button" className="stepx-action" disabled={busy} onClick={() => counter(offer)}>
                    Contre-proposer
                  </button>
                  <button type="button" className="stepx-action" disabled={busy} onClick={() => void answer(offer, false)}>
                    Refuser
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {error && !composing ? <p className="stepx-error" role="alert">{error}</p> : null}

      {open && !composing && !agreed ? (
        waitingForOther ? (
          <p className="ngx-wait">
            <span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>
            Votre proposition attend une réponse.
          </p>
        ) : !waitingForMe ? (
          <button type="button" className="stepx-next" onClick={() => { setComposing(true); setError(null); }}>
            {offers.length ? "Nouvelle proposition" : "Faire une proposition"}
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
          </button>
        ) : null
      ) : null}

      {open && composing ? (
        <form className="stepx-form ngx-form" onSubmit={submit} noValidate>
          <h3>{pending ? "Votre contre-proposition" : "Nouvelle proposition"}</h3>
          <div className="stepx-row">
            <label>
              <span>Salaire</span>
              <input inputMode="decimal" value={salary} placeholder="Ex. 2500" onChange={(e) => { setSalary(e.target.value); setError(null); }} />
            </label>
            <label>
              <span>Devise</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {["TND", "EUR", "USD", "GBP", "MAD", "AED"].map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="stepx-row">
            <label>
              <span>Contrat</span>
              <select value={contractType} onChange={(e) => setContractType(e.target.value)}>
                {CONTRACT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Début</span>
              <input type="date" value={startDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setStartDate(e.target.value); setError(null); }} />
            </label>
          </div>
          <label>
            <span>Lieu</span>
            <input value={location} placeholder="Ville, salle…" maxLength={160} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label>
            <span>Message (optionnel)</span>
            <input value={note} maxLength={1000} placeholder="Période d’essai, avantages, horaires…" onChange={(e) => setNote(e.target.value)} />
          </label>
          {error ? <p className="stepx-error" role="alert">{error}</p> : null}
          <div className="stepx-actions">
            <button type="button" className="stepx-action" disabled={busy} onClick={() => { setComposing(false); setError(null); }}>
              Annuler
            </button>
            <button type="submit" className="stepx-action is-primary" disabled={busy}>
              {busy ? "Envoi…" : "Envoyer la proposition"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
