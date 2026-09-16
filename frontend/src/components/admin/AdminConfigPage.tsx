import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchCountries } from "@/features/onboarding/api";
import type { CountrySummary } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import { fetchPlatformSettings, savePlatformSettings } from "@/features/coaching/api";
import {
  deleteServiceCategory,
  fetchAdminServiceCategories,
  saveServiceCategory,
  type ServiceCategory,
} from "@/features/services/api";
import {
  deleteProductCategory,
  fetchAdminProductCategories,
  saveProductCategory,
  type ProductCategory,
} from "@/features/marketplace/api";
import { AdminRolesPage } from "@/features/admin/pages/AdminRolesPage";
import { AdminMailPage } from "@/features/admin/pages/AdminMailPage";
import { AdminBillingPage } from "@/features/admin/pages/AdminBillingPage";
import { ADMIN_CONFIG, adminConfigBySlug } from "./adminNav";

export function AdminConfigHubPage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Configuration</h1>
          <div className="sub">Langues, devises, pays, catégories, commissions, e-mails, notifications, paramètres</div>
        </div>
      </div>
      <div className="admin-tiles">
        {ADMIN_CONFIG.map((item) => (
          <Link className="admin-tile" to={item.path} key={item.slug}>
            <div className="t">{item.title}</div>
            <div className="s">{item.lead}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdminConfigSectionPage() {
  const { section } = useParams();
  const def = adminConfigBySlug(section);
  if (!def) {
    return <Navigate to="/admin/config" replace />;
  }
  if (def.slug === "roles") {
    return <AdminRolesPage />;
  }
  if (def.slug === "emails") {
    return <AdminMailPage />;
  }
  if (def.slug === "offres") {
    return <AdminBillingPage />;
  }
  if (def.slug === "pays") {
    return <PaysConfigPage title={def.title} lead={def.lead} />;
  }
  if (def.slug === "commissions") {
    return <CommissionsConfigPage title={def.title} lead={def.lead} />;
  }
  if (def.slug === "categories") {
    return <CategoriesConfigPage title={def.title} lead={def.lead} />;
  }
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{def.title}</h1>
          <div className="sub">{def.lead}</div>
        </div>
      </div>
      <Panel>
        <p className="empty-hint">{def.empty}</p>
      </Panel>
    </section>
  );
}

function PaysConfigPage({ title, lead }: { title: string; lead: string }) {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setError("Impossible de charger les pays."));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">{lead}</div>
        </div>
      </div>
      <Panel title={`${countries.length} pays`}>
        {error ? <p className="empty-hint">{error}</p> : null}
        {!error && countries.length === 0 ? <p className="empty-hint">Aucun pays n’est configuré.</p> : null}
        {countries.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Pays</th>
                <th>ISO</th>
                <th>Indicatif</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.flagEmoji} {item.name}
                  </td>
                  <td>{item.iso2}</td>
                  <td>{item.callingCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>
    </section>
  );
}

function CommissionsConfigPage({ title, lead }: { title: string; lead: string }) {
  const [rate, setRate] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchPlatformSettings()
      .then((s) => setRate(s.commissionRate))
      .catch(() => setError("Impossible de charger le taux de commission."));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await savePlatformSettings(rate);
      setRate(updated.commissionRate);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer le taux de commission.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">{lead}</div>
        </div>
      </div>
      <Panel title="Coaching">
        <div className="panel-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field" style={{ maxWidth: 220 }}>
            <span>Commission plateforme (%)</span>
            <input type="number" min={0} max={100} step="0.5" value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {saved ? <span className="empty-hint">Enregistré</span> : null}
          {error ? <p className="auth-error" style={{ flexBasis: "100%" }}>{error}</p> : null}
          <p className="field-hint" style={{ flexBasis: "100%" }}>
            Taux appliqué sur chaque paiement de séance ou de pack de coaching. Aucun reversement réel n’est
            encore effectué (paiement de test) — ce taux sert à préparer le futur prestataire de paiement.
          </p>
        </div>
      </Panel>
    </section>
  );
}

function CategoriesConfigPage({ title, lead }: { title: string; lead: string }) {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">{lead}</div>
        </div>
      </div>
      <CategoryManager
        heading="Catégories Services"
        fetchAll={fetchAdminServiceCategories}
        save={saveServiceCategory}
        remove={deleteServiceCategory}
      />
      <CategoryManager
        heading="Catégories Marketplace"
        fetchAll={fetchAdminProductCategories}
        save={saveProductCategory}
        remove={deleteProductCategory}
      />
    </section>
  );
}

type CategoryLike = { id: string; name: string; sortOrder: number; active: boolean };

function CategoryManager({
  heading,
  fetchAll,
  save,
  remove,
}: {
  heading: string;
  fetchAll: () => Promise<ServiceCategory[] | ProductCategory[]>;
  save: (id: string | null, request: { name: string; sortOrder: number; active: boolean }) => Promise<CategoryLike>;
  remove: (id: string) => Promise<void>;
}) {
  const [categories, setCategories] = useState<CategoryLike[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sortOrder: 0, active: true });
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchAll()
      .then(setCategories)
      .catch(() => setError("Impossible de charger les catégories."));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setEditing(null);
    setForm({ name: "", sortOrder: (categories.at(-1)?.sortOrder ?? 0) + 10, active: true });
    setShowForm(true);
  }

  function startEdit(category: CategoryLike) {
    setEditing(category.id);
    setForm({ name: category.name, sortOrder: category.sortOrder, active: category.active });
    setShowForm(true);
  }

  async function submit() {
    setError(null);
    try {
      await save(editing, form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer cette catégorie.");
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await remove(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de supprimer cette catégorie.");
    }
  }

  return (
    <>
      <div className="page-head" style={{ paddingTop: 8 }}>
        <div>
          <h2 style={{ fontSize: 20 }}>{heading}</h2>
        </div>
        <div className="head-actions">
          <Button variant="mini" onClick={startCreate}>
            + Ajouter
          </Button>
        </div>
      </div>

      {showForm ? (
        <Panel title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}>
          <div className="panel-body">
            <div className="two-col">
              <label className="field">
                <span>Nom</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Technique" />
              </label>
              <label className="field">
                <span>Ordre d’affichage</span>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </label>
            </div>
            <label className="settings-row" style={{ maxWidth: 260 }}>
              <span>Active</span>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
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
        </Panel>
      ) : null}

      <Panel title={`${categories.length} catégorie(s)`}>
        {error && !showForm ? <p className="empty-hint">{error}</p> : null}
        {categories.length === 0 ? (
          <p className="empty-hint">Aucune catégorie pour l’instant.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Ordre</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.sortOrder}</td>
                  <td>{category.active ? "Active" : "Désactivée"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <Button variant="mini" onClick={() => startEdit(category)}>
                      Modifier
                    </Button>
                    <Button variant="danger" onClick={() => void onRemove(category.id)}>
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
