import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { deleteCoachService, fetchCoachServices, saveCoachService, type CoachService } from "../api";

const EMPTY = { name: "", description: "", durationMinutes: 60, priceAmount: "0", priceCurrency: "TND", active: true };

export function CoachServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<CoachService[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchCoachServices().then(setServices).catch(() => setServices([]));
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
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
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    try {
      await saveCoachService(editing, {
        name: form.name,
        description: form.description || null,
        durationMinutes: Number(form.durationMinutes),
        priceAmount: form.priceAmount,
        priceCurrency: form.priceCurrency,
        active: form.active,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer ce service.");
    }
  }

  async function remove(id: string) {
    await deleteCoachService(id);
    load();
  }

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

      {showForm ? (
        <motion.div className="panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="panel-head">
            <h2>{editing ? "Modifier le service" : "Nouveau service"}</h2>
          </div>
          <div className="panel-body">
            <label className="field">
              <span>Nom</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coaching individuel" />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <div className="two-col">
              <label className="field">
                <span>Durée (min)</span>
                <input type="number" min={5} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Prix</span>
                <input value={form.priceAmount} onChange={(e) => setForm({ ...form, priceAmount: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Devise</span>
              <select value={form.priceCurrency} onChange={(e) => setForm({ ...form, priceCurrency: e.target.value })}>
                <option value="TND">TND</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
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
        {services.map((service) => (
          <motion.div key={service.id} className="doc-card" whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
            <div className="t">{service.name}</div>
            <div className="org">
              {service.durationMinutes} min · {service.priceAmount} {service.priceCurrency}
            </div>
            {!service.active ? <div className="meta">Désactivé</div> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button variant="mini" onClick={() => startEdit(service)}>
                Modifier
              </Button>
              <Button variant="danger" onClick={() => void remove(service.id)}>
                Supprimer
              </Button>
            </div>
          </motion.div>
        ))}
        {services.length === 0 && !showForm ? <p className="empty-hint">Aucun service pour l’instant.</p> : null}
      </div>
    </section>
  );
}
