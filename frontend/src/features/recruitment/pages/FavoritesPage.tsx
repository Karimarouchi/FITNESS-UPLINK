import { useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness } from "@/features/auth/types";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { unfavoriteCandidate } from "@/features/talent/api";
import { StartRecruitmentModal } from "../StartRecruitmentModal";
import { fetchFavorites, statusLabel, type FavoriteCard, type Recruitment } from "../api";

export function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavoriteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [startFor, setStartFor] = useState<FavoriteCard | null>(null);

  useEffect(() => {
    fetchFavorites()
      .then(setItems)
      .catch(() => setError("Impossible de charger vos favoris."))
      .finally(() => setLoading(false));
  }, []);

  if (!isBusiness(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function remove(item: FavoriteCard) {
    try {
      await unfavoriteCandidate(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      setFlash(`${item.displayName} a été retiré des favoris.`);
    } catch {
      setFlash("Impossible de retirer ce favori.");
    }
  }

  function onStarted(entry: Recruitment) {
    setItems((current) =>
      current.map((row) =>
        row.id === entry.candidate.id
          ? { ...row, inPipeline: true, pipelineStatus: entry.status, recruitmentId: entry.id }
          : row,
      ),
    );
    setStartFor(null);
    setFlash(`${entry.candidate.displayName} a été ajoutée à votre pipeline de recrutement.`);
  }

  return (
    <section className="tlx-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Favoris</h1>
          <p className="sub">Les talents que vous suivez. Ajoutez-les à votre pipeline quand vous êtes prêt à les contacter.</p>
        </div>
        <Link className="btn-outline" to="/candidates">
          Rechercher des talents
        </Link>
      </div>
      {flash ? <p className="fu-flash" role="status">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {loading ? (
        <div className="tlx-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="tlx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="tlx-sk tlx-sk-avatar" />
              <span className="tlx-sk tlx-sk-line" />
              <span className="tlx-sk tlx-sk-line is-short" />
            </div>
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="tlx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
          <strong>Aucun favori</strong>
          <p>Depuis la recherche de talents, cliquez sur le cœur d’un profil pour le retrouver ici.</p>
          <Link className="tlx-btn is-primary" to="/candidates">
            Rechercher des talents
          </Link>
        </div>
      ) : (
        <>
          {items.length > 0 ? (
            <p className="tlx-count">
              <b>{items.length}</b> favori{items.length > 1 ? "s" : ""}
            </p>
          ) : null}
          <div className="tlx-grid">
            {items.map((item, index) => (
              <article key={item.id} className="tlx-card" style={{ "--i": index } as CSSProperties}>
                <div className="tlx-head">
                  <div className="tlx-avatar">
                    <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={64} />
                  </div>
                  <div className="tlx-id">
                    <h3 className="tlx-name">
                      {item.displayName}
                      {item.verified ? (
                        <span className="tlx-verified material-symbols-outlined" title="Compte vérifié" aria-label="Compte vérifié">
                          verified
                        </span>
                      ) : null}
                    </h3>
                    <p className="tlx-title">{item.title || "Candidat"}</p>
                  </div>
                  <button
                    type="button"
                    className="tlx-fav is-on"
                    aria-label="Retirer des favoris"
                    title="Retirer des favoris"
                    onClick={() => void remove(item)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">favorite</span>
                  </button>
                </div>

                <ul className="tlx-facts">
                  <li>
                    <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
                    {item.city || "—"}
                    {item.country ? ` · ${item.country.flagEmoji} ${item.country.name}` : ""}
                  </li>
                  {item.availabilityLabel ? (
                    <li>
                      <span className="material-symbols-outlined" aria-hidden="true">schedule</span>
                      {item.availabilityLabel}
                    </li>
                  ) : null}
                  {item.experiences[0]?.title ? (
                    <li>
                      <span className="material-symbols-outlined" aria-hidden="true">work_history</span>
                      {item.experiences[0].title}
                    </li>
                  ) : null}
                </ul>

                {item.inPipeline && item.pipelineStatus ? (
                  <div>
                    <span className="pdx-pill">{statusLabel(item.pipelineStatus)}</span>
                  </div>
                ) : null}

                {(item.specialties ?? []).length ? (
                  <div className="tlx-chips">
                    {(item.specialties ?? []).slice(0, 3).map((tag) => (
                      <span key={tag} className="tlx-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="tlx-actions">
                  {item.inPipeline ? (
                    <Link className="tlx-btn is-primary" to="/applications">
                      {item.pipelineStatus === "APPLIED" ? "Voir la candidature" : "Voir le recrutement"}
                    </Link>
                  ) : (
                    <button className="tlx-btn is-primary" type="button" onClick={() => setStartFor(item)}>
                      <span className="material-symbols-outlined" aria-hidden="true">add</span>
                      Ajouter au pipeline
                    </button>
                  )}
                  <Link className="tlx-cta" to={`/candidates/${item.id}`}>
                    Voir le profil
                    <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {startFor ? (
        <StartRecruitmentModal
          candidateId={startFor.id}
          candidateName={startFor.displayName}
          onClose={() => setStartFor(null)}
          onStarted={onStarted}
        />
      ) : null}
    </section>
  );
}
