import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { fetchCountries } from "@/features/onboarding/api";
import type { CountrySummary } from "@/features/auth/types";
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
  if (def.slug === "pays") {
    return <PaysConfigPage title={def.title} lead={def.lead} />;
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
