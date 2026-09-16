import { useEffect, useState } from "react";
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
  priceAmount: "0",
  priceCurrency: "TND",
  validityDays: 90,
  active: true,
};

export function CoachingPacksPage() {
  const { user } = useAuth();
  const isCoach = hasPermission(user, PERMS.COACHING_MANAGE);
  return isCoach ? <CoachPacksView /> : <MemberPacksView />;
}

function CoachPacksView() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<PackOffer[]>([]);
  const [sold, setSold] = useState<CoachingPack[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchMyPackOffers().then(setOffers).catch(() => setOffers([]));
    fetchSoldPacks().then(setSold).catch(() => setSold([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    setError(null);
    try {
      await savePackOffer(null, form);
      setShowForm(false);
      setForm(EMPTY_OFFER);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer cette formule.");
    }
  }

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
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Nouvelle formule
          </Button>
        </div>
      </div>

      {showForm ? (
        <motion.div className="panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="panel-head">
            <h2>Nouvelle formule</h2>
          </div>
          <div className="panel-body">
            <div className="two-col">
              <label className="field">
                <span>Type de pack</span>
                <select value={form.packType} onChange={(e) => setForm({ ...form, packType: e.target.value as PackOffer["packType"] })}>
                  {Object.entries(PACK_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Nombre de séances</span>
                <input type="number" min={1} value={form.sessionCount ?? 1} onChange={(e) => setForm({ ...form, sessionCount: Number(e.target.value) })} />
              </label>
            </div>
            <div className="two-col">
              <label className="field">
                <span>Prix</span>
                <input value={form.priceAmount} onChange={(e) => setForm({ ...form, priceAmount: e.target.value })} />
              </label>
              <label className="field">
                <span>Devise</span>
                <select value={form.priceCurrency} onChange={(e) => setForm({ ...form, priceCurrency: e.target.value })}>
                  <option value="TND">TND</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Validité (jours, optionnel)</span>
              <input type="number" min={1} value={form.validityDays ?? ""} onChange={(e) => setForm({ ...form, validityDays: e.target.value ? Number(e.target.value) : null })} />
            </label>
            {error ? <p className="auth-error mt-6">{error}</p> : null}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <Button variant="primary" onClick={() => void submit()}>
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}

      <div className="doc-grid">
        {offers.map((offer) => (
          <div key={offer.id} className="doc-card">
            <div className="t">{PACK_TYPE_LABELS[offer.packType] ?? offer.packType}</div>
            <div className="org">
              {offer.priceAmount} {offer.priceCurrency}
              {offer.sessionCount ? ` · ${offer.sessionCount} séance(s)` : ""}
            </div>
            <Button variant="danger" onClick={() => void deletePackOffer(offer.id).then(load)}>
              Supprimer
            </Button>
          </div>
        ))}
        {offers.length === 0 ? <p className="empty-hint">Aucune formule de pack pour le moment.</p> : null}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <div className="panel-head">
          <h2>Packs vendus</h2>
        </div>
        {sold.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucun pack vendu pour l’instant.
          </p>
        ) : (
          sold.map((pack) => (
            <div className="booking-item" key={pack.id}>
              <div className="booking-time">{pack.sessionsRemaining}/{pack.sessionsTotal}</div>
              <div className="booking-body">
                <div className="t">{pack.coachDisplayName}</div>
                <div className="s">
                  {pack.status} {pack.expiresAt ? `· expire le ${new Date(pack.expiresAt).toLocaleDateString("fr-FR")}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function MemberPacksView() {
  const [packs, setPacks] = useState<CoachingPack[]>([]);

  useEffect(() => {
    fetchMyPacks().then(setPacks).catch(() => setPacks([]));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes packs</h1>
          <p className="sub">Suivez vos séances achetées, utilisées et restantes.</p>
        </div>
      </div>
      <div className="doc-grid">
        {packs.map((pack) => {
          const progress = pack.sessionsTotal > 0 ? Math.round((pack.sessionsUsed / pack.sessionsTotal) * 100) : 0;
          return (
            <motion.div key={pack.id} className="doc-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
              <div className="t">{pack.coachDisplayName}</div>
              <div className="org">
                {pack.sessionsRemaining} / {pack.sessionsTotal} séance(s) restante(s)
              </div>
              <div style={{ height: 6, background: "var(--paper-line)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", background: "var(--lime)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease }}
                />
              </div>
              {pack.expiresAt ? <div className="meta" style={{ marginTop: 6 }}>Expire le {new Date(pack.expiresAt).toLocaleDateString("fr-FR")}</div> : null}
              {pack.status !== "ACTIVE" ? <div className="meta">{pack.status === "EXPIRED" ? "Expiré" : "Épuisé"}</div> : null}
            </motion.div>
          );
        })}
        {packs.length === 0 ? (
          <p className="empty-hint">
            Aucun pack pour l’instant. Achetez-en un depuis la page d’un coach.
          </p>
        ) : null}
      </div>
    </section>
  );
}
