import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import {
  deleteProviderService,
  fetchMyProviderServices,
  fetchServiceCategories,
  saveProviderService,
  type ProviderService,
  type ServiceCategory,
} from "../api";

const EMPTY = { categoryId: "", name: "", description: "", active: true };

export function MyServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<ProviderService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchMyProviderServices().then(setServices).catch(() => setServices([]));
    fetchServiceCategories().then(setCategories).catch(() => setCategories([]));
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function startEdit(service: ProviderService) {
    setEditing(service.id);
    setForm({ categoryId: service.categoryId, name: service.name, description: service.description ?? "", active: service.active });
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    if (!form.categoryId) {
      setError("Choisissez une catégorie.");
      return;
    }
    try {
      await saveProviderService(editing, {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description || null,
        active: form.active,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer ce service.");
    }
  }

  async function remove(id: string) {
    await deleteProviderService(id);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes services</h1>
          <p className="sub">Détaillez les prestations que vous proposez aux salles et studios.</p>
        </div>
        <div className="head-actions">
          {user ? (
            <Button variant="outline" to={`/services/providers/${user.id}`}>
              Voir ma fiche publique
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
              <span>Catégorie</span>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Sélectionner</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nom du service</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maintenance des équipements cardio" />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea className="custom-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
            <div className="org">{service.categoryName}</div>
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
