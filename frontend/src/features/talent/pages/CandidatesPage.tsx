import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { favoriteCandidate, fetchCandidates, unfavoriteCandidate, type CandidateCard } from "../api";
import { CandidatePhoto } from "../CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin } from "@/features/auth/types";

export function CandidatesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
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
    return <Navigate to="/" replace />;
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
    <section className="talent-page">
      <div className="talent-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1 className="font-display-lg-mobile text-primary">Recherche de talents</h1>
        </div>
      </div>
      <input
        className="custom-input talent-search"
        value={query}
        placeholder="Rechercher un nom, une ville, une spécialité…"
        onChange={(event) => setQuery(event.target.value)}
      />
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 ? (
        <p className="font-body-md text-on-surface-variant">Aucun candidat pour le moment.</p>
      ) : (
        <div className="talent-grid">
          {items.map((item) => (
            <article key={item.id} className="talent-card talent-card--static">
              <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={64} />
              <div className="talent-card-copy">
                <div className="talent-card-title">
                  <h2>{item.displayName}</h2>
                  <VerificationBadge verified={item.verified} compact />
                </div>
                <p>{item.title || "Candidat"}</p>
                <p className="text-on-surface-variant">
                  {item.city || "—"}
                  {item.country ? ` · ${item.country.flagEmoji} ${item.country.name}` : ""}
                </p>
                {item.availabilityLabel ? <p className="talent-meta">{item.availabilityLabel}</p> : null}
                <div className="talent-chips">
                  {(item.specialties ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className="talent-chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="fiche-actions">
                  {isBusiness(user) ? (
                    <button className={item.favorite ? "ob-primary" : "ob-secondary"} type="button" onClick={() => void toggleFavorite(item)}>
                      {item.favorite ? "♥ Favori" : "♡ Favori"}
                    </button>
                  ) : null}
                  <Link className="ob-secondary" to={`/candidates/${item.id}`}>
                    Voir le profil
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
