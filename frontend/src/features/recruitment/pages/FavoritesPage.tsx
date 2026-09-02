import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness } from "@/features/auth/types";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { unfavoriteCandidate } from "@/features/talent/api";
import { StartRecruitmentModal } from "../StartRecruitmentModal";
import { PipelineStatusBadge } from "../PipelineStatusBadge";
import {
  fetchFavorites,
  statusLabel,
  updateRecruitmentStatus,
  type FavoriteCard,
  type Recruitment,
} from "../api";

export function FavoritesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FavoriteCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [startFor, setStartFor] = useState<FavoriteCard | null>(null);
  const [contactPrompt, setContactPrompt] = useState<FavoriteCard | null>(null);

  useEffect(() => {
    fetchFavorites()
      .then(setItems)
      .catch(() => setError("Impossible de charger vos favoris."));
  }, []);

  if (!isBusiness(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function remove(item: FavoriteCard) {
    await unfavoriteCandidate(item.id);
    setItems((current) => current.filter((row) => row.id !== item.id));
    setFlash(`${item.displayName} a été retiré des favoris.`);
  }

  function contact(item: FavoriteCard) {
    window.location.href = `mailto:${item.email}`;
    if (item.inPipeline && item.pipelineStatus === "NEW") {
      setContactPrompt(item);
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
    <section className="talent-page">
      <div className="talent-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1 className="font-display-lg-mobile text-primary">Favoris</h1>
        </div>
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? (
        <div className="fu-empty">
          <p>Aucun profil enregistré dans vos favoris.</p>
          <Link className="ob-primary" to="/candidates">
            Rechercher des talents
          </Link>
        </div>
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
                {item.experiences[0]?.title ? <p className="talent-meta">{item.experiences[0].title}</p> : null}
                {item.availabilityLabel ? <p>{item.availabilityLabel}</p> : null}
                {item.inPipeline && item.pipelineStatus ? <PipelineStatusBadge status={item.pipelineStatus} /> : null}
                <div className="talent-chips">
                  {(item.specialties ?? []).slice(0, 3).map((tag) => (
                    <span key={tag} className="talent-chip">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="fiche-actions">
                  <Link className="ob-secondary" to={`/candidates/${item.id}`}>
                    Voir le profil
                  </Link>
                  <button className="ob-secondary" type="button" onClick={() => contact(item)}>
                    Contacter
                  </button>
                  {item.inPipeline ? (
                    <Link className="ob-primary" to="/pipeline">
                      Voir le recrutement
                    </Link>
                  ) : (
                    <button className="ob-primary" type="button" onClick={() => setStartFor(item)}>
                      Démarrer le recrutement
                    </button>
                  )}
                  <button className="ob-secondary" type="button" onClick={() => void remove(item)}>
                    Retirer des favoris
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {startFor ? (
        <StartRecruitmentModal
          candidateId={startFor.id}
          candidateName={startFor.displayName}
          onClose={() => setStartFor(null)}
          onStarted={onStarted}
        />
      ) : null}
      {contactPrompt ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setContactPrompt(null)}>
          <div className="fu-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <p>
              {contactPrompt.displayName} est actuellement au statut Nouveau. Voulez-vous le passer à Contacté ?
            </p>
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" onClick={() => setContactPrompt(null)}>
                Non
              </button>
              <button
                className="ob-primary"
                type="button"
                onClick={() => {
                  if (contactPrompt.recruitmentId) {
                    void updateRecruitmentStatus(contactPrompt.recruitmentId, "CONTACTED").then(() => {
                      setItems((current) =>
                        current.map((row) =>
                          row.id === contactPrompt.id ? { ...row, pipelineStatus: "CONTACTED" } : row,
                        ),
                      );
                      setFlash(`Statut de ${contactPrompt.displayName} mis à jour : ${statusLabel("CONTACTED")}.`);
                    });
                  }
                  setContactPrompt(null);
                }}
              >
                Passer à Contacté
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
