import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { OpportunityCard } from "@/features/jobs/OpportunityCard";
import { fetchOpportunities, type Opportunity } from "@/features/jobs/api";

export function OpportunitiesPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [items, setItems] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOpportunities(query)
      .then(setItems)
      .catch(() => setError("Impossible de charger les opportunités."));
  }, [query]);

  return (
    <section className="hire-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Opportunités</h1>
          <p className="sub">Offres publiées par les salles et studios. Ouvrez une fiche, puis postulez en un clic.</p>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? (
        <p className="empty-hint">Aucune offre publiée pour le moment.</p>
      ) : (
        <div className="oppx-grid">
          {items.map((item, index) => (
            <OpportunityCard key={item.id} item={item} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
