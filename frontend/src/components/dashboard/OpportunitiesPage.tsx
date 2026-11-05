import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Compass, Search } from "lucide-react";
import { OpportunityCard } from "@/features/jobs/OpportunityCard";
import { fetchOpportunities, type Opportunity } from "@/features/jobs/api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import "@/shared/styles/backoffice-hire.css";

export function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [text, setText] = useState(query);
  const [items, setItems] = useState<Opportunity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // the search box feeds the existing `q` parameter, after a short pause
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = text.trim();
      if (next !== query) {
        setParams(next ? { q: next } : {}, { replace: true });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [text, query, setParams]);

  useEffect(() => {
    setText(query);
  }, [query]);

  useEffect(() => {
    fetchOpportunities(query)
      .then((rows) => {
        setItems(rows);
        setError(null);
      })
      .catch(() => {
        setItems([]);
        setError("Impossible de charger les opportunités.");
      });
  }, [query]);

  return (
    <section className="bo-dash bo-users bo-bm bo-hr">
      <header className="bo-dash-head">
        <div>
          <h1>Opportunités</h1>
          <p>Offres publiées par les salles et studios. Ouvrez une fiche, puis postulez en un clic.</p>
        </div>
      </header>

      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        <div className="bo-users-toolbar">
          <div className="bm-card-title">
            <span className="bo-dash-icon" aria-hidden="true">
              <Compass size={22} />
            </span>
            <div>
              <h2>Offres disponibles</h2>
              <p>{items === null ? "Chargement…" : `${items.length} offre${items.length > 1 ? "s" : ""}`}</p>
            </div>
          </div>
          <label className="bo-users-search bm-toolbar-end">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Rechercher une offre…"
              aria-label="Rechercher une offre"
            />
          </label>
        </div>

        {items === null ? (
          <div className="hr-grid" aria-busy="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className="bo-skeleton hr-skel" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bo-users-empty">
            <span>
              <Compass size={22} aria-hidden="true" />
            </span>
            <strong>{query ? "Aucun résultat" : "Aucune offre"}</strong>
            <p>{query ? "Aucune offre ne correspond à cette recherche." : "Aucune offre publiée pour le moment."}</p>
          </div>
        ) : (
          <div className="hr-grid">
            {items.map((item, index) => (
              <OpportunityCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
