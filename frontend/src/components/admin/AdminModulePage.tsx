import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchCandidates, type CandidateCard } from "@/features/talent/api";
import { AdminBillingPage } from "@/features/admin/pages/AdminBillingPage";
import { AdminCoachingPage } from "@/features/admin/pages/AdminCoachingPage";
import { adminModuleBySlug } from "./adminNav";

export function AdminModulePage() {
  const { module } = useParams();
  const def = adminModuleBySlug(module);
  if (!def) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (def.slug === "recruitment") {
    return <AdminRecruitmentPage lead={def.lead} title={def.title} empty={def.empty} />;
  }
  if (def.slug === "subscriptions") {
    return <AdminBillingPage />;
  }
  if (def.slug === "coaching") {
    return <AdminCoachingPage />;
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

function AdminRecruitmentPage({ title, lead, empty }: { title: string; lead: string; empty: string }) {
  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates()
      .then((page) => setCandidates(page.items))
      .catch(() => setError("Impossible de charger les candidats."));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <div className="sub">{lead}</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/candidates">
            Recherche de talents
          </Button>
        </div>
      </div>
      <Panel title={`Candidats visibles (${candidates.length})`}>
        {error ? <p className="empty-hint">{error}</p> : null}
        {!error && candidates.length === 0 ? <p className="empty-hint">{empty}</p> : null}
        {candidates.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Titre</th>
                <th>Pays</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {candidates.slice(0, 12).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/candidates/${item.id}`}>{item.displayName}</Link>
                  </td>
                  <td>{item.title || "—"}</td>
                  <td>{item.country ? `${item.country.flagEmoji} ${item.country.name}` : "—"}</td>
                  <td>{item.verified ? "Vérifié" : "En attente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>
    </section>
  );
}
