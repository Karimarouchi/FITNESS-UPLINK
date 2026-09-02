import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Tag } from "@/components/ui/Tag";
import { ApiError } from "@/shared/api/client";
import { applyToOpportunity, fetchOpportunities, CONTRACT_TYPES, type Opportunity } from "@/features/jobs/api";
import { recruitmentError } from "@/features/recruitment/api";

export function OpportunitiesPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [items, setItems] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities(query)
      .then(setItems)
      .catch(() => setError("Impossible de charger les opportunités."));
  }, [query]);

  async function apply(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await applyToOpportunity(id);
      setItems((current) => current.map((item) => (item.id === id ? { ...item, applied: true } : item)));
    } catch (err) {
      setError(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de postuler.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Opportunités</h1>
          <div className="sub">Offres publiées par les employeurs de la plateforme</div>
        </div>
      </div>
      <Panel>
        {error ? <p className="empty-hint">{error}</p> : null}
        {items.length === 0 && !error ? <p className="empty-hint">Aucune offre publiée pour le moment.</p> : null}
        {items.map((opp) => (
          <div className="opp-item" key={opp.id}>
            <div className="opp-main">
              <div className="t">{opp.title}</div>
              <div className="c">
                {opp.employerName}
                {opp.location ? ` · ${opp.location}` : ""}
                {opp.employerCountry ? ` · ${opp.employerCountry.flagEmoji} ${opp.employerCountry.name}` : ""}
              </div>
              <div className="tag-row">
                {opp.contractType ? <Tag>{contractLabel(opp.contractType)}</Tag> : null}
                {opp.salaryAmount ? <Tag>{`${opp.salaryAmount} ${opp.salaryCurrency ?? ""}`.trim()}</Tag> : null}
                {opp.languages.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            {opp.applied ? (
              <Button variant="mini">Déjà postulé</Button>
            ) : (
              <Button variant="primary" disabled={busyId === opp.id} onClick={() => void apply(opp.id)}>
                Postuler
              </Button>
            )}
          </div>
        ))}
      </Panel>
    </section>
  );
}

function contractLabel(value: string) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? value;
}
