import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { deleteCoachService, fetchCoachServices, saveCoachService, type CoachService } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

const EMPTY = { name: "", description: "", durationMinutes: 60, priceAmount: "", priceCurrency: "TND", active: true };

const DURATION_PRESETS = [30, 45, 60, 90, 120];

const SERVICE_ERRORS: Record<string, string> = {
  SERVICE_NAME_REQUIRED: "Donnez un nom à votre service.",
  SERVICE_DURATION_INVALID: "La durée doit être comprise entre 5 et 480 minutes.",
  SERVICE_PRICE_INVALID: "Le prix doit être un nombre positif ou nul.",
  SERVICE_CURRENCY_INVALID: "Devise invalide.",
};

function serviceError(err: unknown) {
  return err instanceof ApiError ? (SERVICE_ERRORS[err.message] ?? "Action impossible.") : "Action impossible.";
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function CoachServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<CoachService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function load() {
    fetchCoachServices()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  }

  function startEdit(service: CoachService) {
    setEditing(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
      priceCurrency: service.priceCurrency,
      active: service.active,
    });
    setError(null);
    setShowForm(true);
  }

  async function submit() {
    const price = Number(form.priceAmount.replace(",", "."));
    if (!form.name.trim()) {
      setError(SERVICE_ERRORS.SERVICE_NAME_REQUIRED);
      return;
    }
    if (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 5 || form.durationMinutes > 480) {
      setError(SERVICE_ERRORS.SERVICE_DURATION_INVALID);
      return;
    }
    if (form.priceAmount.trim() === "" || !Number.isFinite(price) || price < 0) {
      setError(SERVICE_ERRORS.SERVICE_PRICE_INVALID);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveCoachService(editing, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        durationMinutes: Number(form.durationMinutes),
        priceAmount: String(price),
        priceCurrency: form.priceCurrency,
        active: form.active,
      });
      setShowForm(false);
      setFlash(editing ? "Service modifié." : "Service créé.");
      load();
    } catch (err) {
      setError(serviceError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(service: CoachService) {
    const { id, ...rest } = service;
    try {
      await saveCoachService(id, { ...rest, active: !service.active });
      setFlash(service.active ? "Service masqué aux clients." : "Service visible par les clients.");
      load();
    } catch (err) {
      setFlash(serviceError(err));
    }
  }

  async function remove(id: string) {
    try {
      await deleteCoachService(id);
      setFlash("Service supprimé.");
      load();
    } catch (err) {
      setFlash(serviceError(err));
    } finally {
      setConfirmId(null);
    }
  }

  const activeCount = services.filter((service) => service.active).length;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes services</h1>
          <p className="sub">Créez vos prestations : nom, durée et tarif. Vous gardez la main sur tout.</p>
        </div>
        <div className="head-actions">
          {user ? (
            <Button variant="outline" to={`/coaches/${user.id}`}>
              Voir mon profil public
            </Button>
          ) : null}
          <Button variant="primary" onClick={startCreate}>
            + Ajouter un service
          </Button>
        </div>
      </div>

      {services.length > 0 ? (
        <div className="pcx-stats">
          <div className="pcx-stat" style={{ "--i": 0 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">fitness_center</span>
            <b>{services.length}</b>
            <small>Service{services.length > 1 ? "s" : ""}</small>
          </div>
          <div className="pcx-stat" style={{ "--i": 1 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
            <b>{activeCount}</b>
            <small>Visible{activeCount > 1 ? "s" : ""} par les clients</small>
          </div>
        </div>
      ) : null}

      {flash ? <p className="fu-flash" role="status">{flash}</p> : null}

      {showForm ? (
        <motion.div className="pcx-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
          <h2>{editing ? "Modifier le service" : "Nouveau service"}</h2>
          <label className="field">
            <span>Nom</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coaching individuel" maxLength={120} />
          </label>
          <label className="field">
            <span>Description (optionnel)</span>
            <textarea
              value={form.description}
              rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ce que le client peut attendre de cette séance…"
            />
          </label>
          <div className="field">
            <span>Durée</span>
            <div className="pcx-types" role="radiogroup" aria-label="Durée">
              {DURATION_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  role="radio"
                  aria-checked={form.durationMinutes === minutes}
                  className={form.durationMinutes === minutes ? "pcx-type is-on" : "pcx-type"}
                  onClick={() => setForm({ ...form, durationMinutes: minutes })}
                >
                  {formatDuration(minutes)}
                </button>
              ))}
              <label className="pcx-inline">
                <input
                  type="number"
                  min={5}
                  max={480}
                  aria-label="Durée en minutes"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                />
                min
              </label>
            </div>
          </div>
          <div className="pcx-fields">
            <label className="field">
              <span>Prix</span>
              <input
                inputMode="decimal"
                placeholder="Ex. 80 (0 = gratuit)"
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
          </div>
          <label className="pcx-check">
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              className="pcx-switch"
              onClick={() => setForm({ ...form, active: !form.active })}
            >
              <span />
            </button>
            {form.active ? "Visible : les clients peuvent le réserver" : "Masqué : les clients ne le voient pas"}
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="pcx-form-actions">
            <Button variant="outline" disabled={busy} onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void submit()}>
              {busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le service"}
            </Button>
          </div>
        </motion.div>
      ) : null}

      {loading ? (
        <div className="pcx-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="pcx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="pcx-sk" />
              <span className="pcx-sk is-short" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        !showForm ? (
          <div className="pcx-empty">
            <span className="material-symbols-outlined" aria-hidden="true">fitness_center</span>
            <strong>Aucun service</strong>
            <p>Ajoutez votre première prestation (séance individuelle, bilan, coaching en ligne…) pour être réservable.</p>
            <button type="button" className="pcx-btn is-primary" onClick={startCreate}>
              Créer mon premier service
            </button>
          </div>
        ) : null
      ) : (
        <div className="pcx-grid">
          {services.map((service, index) => {
            const price = Number(service.priceAmount);
            return (
              <article key={service.id} className={service.active ? "pcx-card" : "pcx-card is-off"} style={{ "--i": index } as CSSProperties}>
                <div className="pcx-top">
                  <span className="pcx-icon material-symbols-outlined" aria-hidden="true">fitness_center</span>
                  <span className={service.active ? "pcx-badge is-live" : "pcx-badge"}>{service.active ? "Visible" : "Masqué"}</span>
                </div>
                <h3 className="pcx-name">{service.name}</h3>
                <p className="pcx-price">
                  {price === 0 ? (
                    <b>Gratuit</b>
                  ) : (
                    <>
                      <b>{price.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</b> {service.priceCurrency}
                    </>
                  )}
                </p>
                <ul className="pcx-facts">
                  <li>
                    <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                    {formatDuration(service.durationMinutes)}
                  </li>
                </ul>
                {service.description ? <p className="pcx-desc">{service.description}</p> : null}
                {confirmId === service.id ? (
                  <div className="pcx-confirm" role="alert">
                    <span>Supprimer ce service ?</span>
                    <button type="button" className="pcx-btn" onClick={() => setConfirmId(null)}>Non</button>
                    <button type="button" className="pcx-btn is-danger" onClick={() => void remove(service.id)}>Oui, supprimer</button>
                  </div>
                ) : (
                  <div className="pcx-actions">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={service.active}
                      aria-label={service.active ? "Masquer ce service" : "Rendre ce service visible"}
                      title={service.active ? "Masquer ce service" : "Rendre ce service visible"}
                      className="pcx-switch"
                      onClick={() => void toggleActive(service)}
                    >
                      <span />
                    </button>
                    <button type="button" className="pcx-btn" onClick={() => startEdit(service)}>
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                      Modifier
                    </button>
                    <button type="button" className="pcx-btn is-ghost-danger" onClick={() => setConfirmId(service.id)}>
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
    </section>
  );
}
