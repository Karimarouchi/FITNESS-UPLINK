import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin } from "@/features/auth/types";
import { pipelineTone, statusLabel } from "@/features/recruitment/api";
import { candidateLocation, favoriteCandidate, fetchCandidates, unfavoriteCandidate, type CandidateCard } from "../api";
import { CandidatePhoto } from "../CandidatePhoto";

export function CandidatesPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [items, setItems] = useState<CandidateCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchCandidates(query)
        .then((list) => {
          if (!cancelled) {
            setItems(list);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger les candidats.");
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  if (!isBusiness(user) && !isSuperAdmin(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function toggleFavorite(item: CandidateCard) {
    if (item.favorite) {
      await unfavoriteCandidate(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, favorite: false } : row)));
    } else {
      await favoriteCandidate(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, favorite: true } : row)));
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Recherche de talents</h1>
          <p className="sub">Trouvez un coach, un préparateur ou un expert à recruter.</p>
        </div>
      </div>
      <label className="page-search">
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
        <input
          value={query}
          placeholder="Nom, ville ou spécialité"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 ? (
        <p className="jobs-empty">
          <strong>Aucun talent</strong>
          <span>
            {query.trim()
              ? "Aucun profil ne correspond à cette recherche."
              : "Aucun candidat n’est visible pour le moment."}
          </span>
        </p>
      ) : (
        <div className="fu-talent-grid">
          {items.map((item) => {
            const place = candidateLocation(item);
            return (
              <article key={item.id} className="fu-talent-card">
                <div className="fu-talent-card-top">
                  <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={56} />
                  <div>
                    <div className="pn">{item.displayName}</div>
                    {item.verified ? <Badge>Compte vérifié</Badge> : null}
                    <div className="pt">{item.title || "Candidat"}</div>
                    <div className="ploc">{place || "Lieu non renseigné"}</div>
                  </div>
                </div>
                {item.availabilityLabel ? <p className="fu-talent-meta">{item.availabilityLabel}</p> : null}
                {item.inPipeline && item.pipelineStatus ? (
                  <StatusPill tone={pipelineTone(item.pipelineStatus)}>{statusLabel(item.pipelineStatus)}</StatusPill>
                ) : null}
                <div className="tag-row">
                  {(item.specialties ?? []).slice(0, 4).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
                <div className="fu-talent-card-actions">
                  {isBusiness(user) ? (
                    <Button variant={item.favorite ? "primary" : "outline"} type="button" onClick={() => void toggleFavorite(item)}>
                      {item.favorite ? "Favori" : "Ajouter aux favoris"}
                    </Button>
                  ) : null}
                  <Button variant="mini" to={`/candidates/${item.id}`}>
                    Voir le profil
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
