import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { ApiError } from "@/shared/api/client";
import {
  PACK_TYPE_LABELS,
  deletePackOffer,
  fetchMyPackOffers,
  fetchMyPacks,
  fetchSoldPacks,
  savePackOffer,
  type CoachingPack,
  type PackOffer,
} from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

const EMPTY_OFFER: Omit<PackOffer, "id"> = {
  packType: "FIVE",
  sessionCount: 5,
  priceAmount: "",
  priceCurrency: "TND",
  validityDays: 90,
  active: true,
};

const TYPE_DEFAULT_SESSIONS: Record<string, number | null> = {
  SINGLE: 1,
  FIVE: 5,
  TEN: 10,
  MONTHLY: 30,
  CUSTOM: null,
};

const TYPE_ICONS: Record<string, string> = {
  SINGLE: "looks_one",
  FIVE: "filter_5",
  TEN: "filter_none",
  MONTHLY: "calendar_month",
  CUSTOM: "tune",
};

const PACK_ERRORS: Record<string, string> = {
  PACK_PRICE_INVALID: "Le prix doit être supérieur à 0.",
  PACK_SESSION_COUNT_INVALID: "Le nombre de séances doit être au moins 1.",
  PACK_CURRENCY_INVALID: "Devise invalide.",
  PACK_OFFER_NOT_FOUND: "Cette formule n’existe plus.",
};

function packError(err: unknown) {
  return err instanceof ApiError ? (PACK_ERRORS[err.message] ?? "Action impossible.") : "Action impossible.";
}

const STATUS_LABELS: Record<CoachingPack["status"], string> = {
  ACTIVE: "Actif",
  EXHAUSTED: "Épuisé",
  EXPIRED: "Expiré",
};

function perSession(offer: { priceAmount: string; sessionCount: number | null }) {
  const price = Number(offer.priceAmount);
  if (!offer.sessionCount || offer.sessionCount < 2 || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  return price / offer.sessionCount;
}

function money(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currency}`;
}

export function CoachingPacksPage() {
  const { user } = useAuth();
  const isCoach = hasPermission(user, PERMS.COACHING_MANAGE);
  return isCoach ? <CoachPacksView /> : <MemberPacksView />;
}

function CoachPacksView() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<PackOffer[]>([]);
  const [sold, setSold] = useState<CoachingPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function load() {
    Promise.all([
      fetchMyPackOffers().then(setOffers).catch(() => setOffers([])),
      fetchSoldPacks().then(setSold).catch(() => setSold([])),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_OFFER);
    setError(null);
    setShowForm(true);
  }

  function openEdit(offer: PackOffer) {
    const { id, ...rest } = offer;
    setEditingId(id);
    setForm(rest);
    setError(null);
    setShowForm(true);
  }

  function pickType(packType: PackOffer["packType"]) {
    setForm((current) => ({
      ...current,
      packType,
      sessionCount: TYPE_DEFAULT_SESSIONS[packType] ?? current.sessionCount ?? 1,
    }));
  }

  async function submit() {
    const price = Number(form.priceAmount.replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      setError(PACK_ERRORS.PACK_PRICE_INVALID);
      return;
    }
    if (form.sessionCount !== null && form.sessionCount < 1) {
      setError(PACK_ERRORS.PACK_SESSION_COUNT_INVALID);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await savePackOffer(editingId, { ...form, priceAmount: String(price) });
      setShowForm(false);
      setFlash(editingId ? "Formule modifiée." : "Formule créée.");
      load();
    } catch (err) {
      setError(packError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(offer: PackOffer) {
    const { id, ...rest } = offer;
    try {
      await savePackOffer(id, { ...rest, active: !offer.active });
      setFlash(offer.active ? "Formule masquée aux clients." : "Formule visible par les clients.");
      load();
    } catch (err) {
      setFlash(packError(err));
    }
  }

  async function remove(id: string) {
    try {
      await deletePackOffer(id);
      setConfirmId(null);
      setFlash("Formule supprimée.");
      load();
    } catch (err) {
      setConfirmId(null);
      setFlash(packError(err));
    }
  }

  const activeOffers = offers.filter((offer) => offer.active).length;
  const remaining = sold.filter((pack) => pack.status === "ACTIVE").reduce((sum, pack) => sum + pack.sessionsRemaining, 0);
  const unit = form.sessionCount && form.sessionCount >= 2 ? perSession({ priceAmount: form.priceAmount.replace(",", "."), sessionCount: form.sessionCount }) : null;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Packs de séances</h1>
          <p className="sub">Définissez vos formules et suivez les packs vendus à vos clients.</p>
        </div>
        <div className="head-actions">
          {user ? (
            <Button variant="outline" to={`/coaches/${user.id}`}>
              Voir mon profil public
            </Button>
          ) : null}
          <Button variant="primary" onClick={openCreate}>
            + Nouvelle formule
          </Button>
        </div>
      </div>

      <div className="pcx-stats">
        <div className="pcx-stat" style={{ "--i": 0 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">sell</span>
          <b>{activeOffers}</b>
          <small>Formule{activeOffers > 1 ? "s" : ""} active{activeOffers > 1 ? "s" : ""}</small>
        </div>
        <div className="pcx-stat" style={{ "--i": 1 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
          <b>{sold.length}</b>
          <small>Pack{sold.length > 1 ? "s" : ""} vendu{sold.length > 1 ? "s" : ""}</small>
        </div>
        <div className="pcx-stat" style={{ "--i": 2 } as CSSProperties}>
          <span className="material-symbols-outlined" aria-hidden="true">event_available</span>
          <b>{remaining}</b>
          <small>Séance{remaining > 1 ? "s" : ""} à honorer</small>
        </div>
      </div>

      {flash ? <p className="fu-flash" role="status">{flash}</p> : null}

      {showForm ? (
        <motion.div className="pcx-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
          <h2>{editingId ? "Modifier la formule" : "Nouvelle formule"}</h2>
          <div className="pcx-types" role="radiogroup" aria-label="Type de pack">
            {Object.entries(PACK_TYPE_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={form.packType === value}
                className={form.packType === value ? "pcx-type is-on" : "pcx-type"}
                onClick={() => pickType(value as PackOffer["packType"])}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{TYPE_ICONS[value]}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="pcx-fields">
            <label className="field">
              <span>Nombre de séances</span>
              <input
                type="number"
                min={1}
                value={form.sessionCount ?? ""}
                onChange={(e) => setForm({ ...form, sessionCount: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className="field">
              <span>Prix</span>
              <input
                inputMode="decimal"
                placeholder="Ex. 250"
                value={form.priceAmount}
                onChange={(e) => setForm({ ...form, priceAmount: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Devise</span>
              <select value={form.priceCurrency} onChange={(e) => setForm({ ...form, priceCurrency: e.target.value })}>
                <option value="TND">TND</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="field">
              <span>Validité (jours, optionnel)</span>
              <input
                type="number"
                min={1}
                placeholder="Sans limite"
                value={form.validityDays ?? ""}
                onChange={(e) => setForm({ ...form, validityDays: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
          </div>
          {unit ? (
            <p className="pcx-hint">
              <span className="material-symbols-outlined" aria-hidden="true">calculate</span>
              Soit {money(unit, form.priceCurrency)} la séance.
            </p>
          ) : null}
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="pcx-form-actions">
            <Button variant="outline" disabled={busy} onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void submit()}>
              {busy ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer la formule"}
            </Button>
          </div>
        </motion.div>
      ) : null}

      <h2 className="pcx-title">Mes formules</h2>
      {loading ? (
        <div className="pcx-grid" aria-busy="true">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="pcx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="pcx-sk" />
              <span className="pcx-sk is-short" />
            </div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="pcx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
          <strong>Aucune formule</strong>
          <p>Proposez des packs de séances à vos clients : 5 séances, 10 séances, abonnement mensuel…</p>
          <button type="button" className="pcx-btn is-primary" onClick={openCreate}>
            Créer ma première formule
          </button>
        </div>
      ) : (
        <div className="pcx-grid">
          {offers.map((offer, index) => {
            const unitPrice = perSession(offer);
            return (
              <article key={offer.id} className={offer.active ? "pcx-card" : "pcx-card is-off"} style={{ "--i": index } as CSSProperties}>
                <div className="pcx-top">
                  <span className="pcx-icon material-symbols-outlined" aria-hidden="true">
                    {TYPE_ICONS[offer.packType] ?? "sell"}
                  </span>
                  <span className={offer.active ? "pcx-badge is-live" : "pcx-badge"}>{offer.active ? "Visible" : "Masquée"}</span>
                </div>
                <h3 className="pcx-name">{PACK_TYPE_LABELS[offer.packType] ?? offer.packType}</h3>
                <p className="pcx-price">
                  <b>{Number(offer.priceAmount).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</b> {offer.priceCurrency}
                </p>
                <ul className="pcx-facts">
                  {offer.sessionCount ? (
                    <li>
                      <span className="material-symbols-outlined" aria-hidden="true">event_repeat</span>
                      {offer.sessionCount} séance{offer.sessionCount > 1 ? "s" : ""}
                    </li>
                  ) : null}
                  {unitPrice ? (
                    <li>
                      <span className="material-symbols-outlined" aria-hidden="true">calculate</span>
                      {money(unitPrice, offer.priceCurrency)} / séance
                    </li>
                  ) : null}
                  <li>
                    <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                    {offer.validityDays ? `Valable ${offer.validityDays} jours` : "Sans limite de durée"}
                  </li>
                </ul>
                {confirmId === offer.id ? (
                  <div className="pcx-confirm" role="alert">
                    <span>Supprimer cette formule ?</span>
                    <button type="button" className="pcx-btn" onClick={() => setConfirmId(null)}>Non</button>
                    <button type="button" className="pcx-btn is-danger" onClick={() => void remove(offer.id)}>Oui, supprimer</button>
                  </div>
                ) : (
                  <div className="pcx-actions">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={offer.active}
                      aria-label={offer.active ? "Masquer cette formule" : "Rendre cette formule visible"}
                      title={offer.active ? "Masquer cette formule" : "Rendre cette formule visible"}
                      className="pcx-switch"
                      onClick={() => void toggleActive(offer)}
                    >
                      <span />
                    </button>
                    <button type="button" className="pcx-btn" onClick={() => openEdit(offer)}>
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                      Modifier
                    </button>
                    <button type="button" className="pcx-btn is-ghost-danger" onClick={() => setConfirmId(offer.id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                      Supprimer
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <h2 className="pcx-title">Packs vendus</h2>
      {sold.length === 0 ? (
        <div className="pcx-empty is-small">
          <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
          <p>Aucun pack vendu pour l’instant. Ils apparaîtront ici dès qu’un client en achète un.</p>
        </div>
      ) : (
        <ul className="pcx-sold">
          {sold.map((pack, index) => {
            const progress = pack.sessionsTotal > 0 ? Math.round((pack.sessionsUsed / pack.sessionsTotal) * 100) : 0;
            return (
              <li key={pack.id} style={{ "--i": index } as CSSProperties}>
                <div className="pcx-sold-main">
                  <strong>{pack.coachDisplayName}</strong>
                  <small>
                    Acheté le {new Date(pack.purchasedAt).toLocaleDateString("fr-FR")}
                    {pack.expiresAt ? ` · expire le ${new Date(pack.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                  </small>
                </div>
                <div className="pcx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={pack.sessionsTotal} aria-valuenow={pack.sessionsUsed}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <b className="pcx-sold-count">{pack.sessionsRemaining}/{pack.sessionsTotal}</b>
                <span className={`pcx-badge is-${pack.status.toLowerCase()}`}>{STATUS_LABELS[pack.status]}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MemberPacksView() {
  const [packs, setPacks] = useState<CoachingPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPacks()
      .then(setPacks)
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes packs</h1>
          <p className="sub">Suivez vos séances achetées, utilisées et restantes.</p>
        </div>
      </div>
      {!loading && packs.length === 0 ? (
        <div className="pcx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">inventory_2</span>
          <strong>Aucun pack</strong>
          <p>Achetez un pack depuis la page d’un coach pour réserver vos séances à prix réduit.</p>
        </div>
      ) : (
        <div className="pcx-grid">
          {packs.map((pack, index) => {
            const progress = pack.sessionsTotal > 0 ? Math.round((pack.sessionsUsed / pack.sessionsTotal) * 100) : 0;
            return (
              <article key={pack.id} className={pack.status === "ACTIVE" ? "pcx-card" : "pcx-card is-off"} style={{ "--i": index } as CSSProperties}>
                <div className="pcx-top">
                  <span className="pcx-icon material-symbols-outlined" aria-hidden="true">fitness_center</span>
                  <span className={`pcx-badge is-${pack.status.toLowerCase()}`}>{STATUS_LABELS[pack.status]}</span>
                </div>
                <h3 className="pcx-name">{pack.coachDisplayName}</h3>
                <p className="pcx-price">
                  <b>{pack.sessionsRemaining}</b> / {pack.sessionsTotal} séance{pack.sessionsTotal > 1 ? "s" : ""} restante{pack.sessionsRemaining > 1 ? "s" : ""}
                </p>
                <div className="pcx-bar" role="progressbar" aria-valuemin={0} aria-valuemax={pack.sessionsTotal} aria-valuenow={pack.sessionsUsed}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                {pack.expiresAt ? (
                  <p className="pcx-meta">Expire le {new Date(pack.expiresAt).toLocaleDateString("fr-FR")}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
