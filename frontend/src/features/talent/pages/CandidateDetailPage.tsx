import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  favoriteCandidate,
  fetchCandidate,
  fetchCandidateFile,
  unfavoriteCandidate,
  type CandidateDetail,
} from "../api";
import { CandidatePhoto } from "../CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified } from "@/features/auth/types";
import { StartRecruitmentModal } from "@/features/recruitment/StartRecruitmentModal";
import { PipelineStatusBadge } from "@/features/recruitment/PipelineStatusBadge";
import { statusLabel, updateRecruitmentStatus, type RecruitmentSummary } from "@/features/recruitment/api";

const LEVELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  native: "Natif",
};

async function openFile(candidateId: string, uploadId: string, name: string) {
  const blob = await fetchCandidateFile(candidateId, uploadId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function latestRecruitment(item: CandidateDetail): RecruitmentSummary | null {
  return item.recruitments?.[0] ?? null;
}

export function CandidateDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [contactPrompt, setContactPrompt] = useState(false);
  const viewerVerified = isVerified(user);

  useEffect(() => {
    let cancelled = false;
    fetchCandidate(id)
      .then((detail) => {
        if (!cancelled) {
          setItem(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger cette fiche.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!isBusiness(user) && !isSuperAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  async function toggleFavorite() {
    if (!item) {
      return;
    }
    if (item.favorite) {
      await unfavoriteCandidate(item.id);
      setItem({ ...item, favorite: false });
      setFlash(`${item.displayName} a été retiré des favoris.`);
    } else {
      await favoriteCandidate(item.id);
      setItem({ ...item, favorite: true });
      setFlash(`${item.displayName} a été ajouté à vos favoris.`);
    }
  }

  function contact() {
    if (!item) {
      return;
    }
    window.location.href = `mailto:${item.email}`;
    const current = latestRecruitment(item);
    if (current?.status === "NEW") {
      setContactPrompt(true);
    }
  }

  if (error) {
    return <p className="auth-error">{error}</p>;
  }
  if (!item) {
    return <p className="font-body-md text-on-surface-variant">Chargement de la fiche…</p>;
  }

  const current = latestRecruitment(item);
  const canRecruit = isBusiness(user);

  return (
    <article className="fiche">
      <Link to="/candidates" className="ob-link fiche-back">
        ← Tous les candidats
      </Link>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      <header className="fiche-hero">
        <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={112} />
        <div>
          <div className="talent-card-title">
            <h1 className="font-display-lg-mobile text-primary">{item.displayName}</h1>
            <VerificationBadge verified={item.verified} />
          </div>
          <p className="font-body-lg">{item.title || "Candidat"}</p>
          <p className="font-body-md text-on-surface-variant">
            {item.city || "—"}
            {item.country ? ` · ${item.country.flagEmoji} ${item.country.name}` : ""}
          </p>
          {canRecruit ? (
            <div className="fiche-actions">
              <button className={item.favorite ? "ob-primary" : "ob-secondary"} type="button" onClick={() => void toggleFavorite()}>
                {item.favorite ? "♥ Favori" : "♡ Favori"}
              </button>
              <button className="ob-secondary" type="button" onClick={contact}>
                Contacter
              </button>
              {current ? (
                <Link className="ob-primary" to="/pipeline">
                  ✓ Recrutement en cours
                  {current.status ? ` · ${statusLabel(current.status)}` : ""}
                </Link>
              ) : (
                <button className="ob-primary" type="button" onClick={() => setModalOpen(true)}>
                  Démarrer le recrutement
                </button>
              )}
            </div>
          ) : null}
          {current ? (
            <p className="talent-meta">
              Recrutement en cours <PipelineStatusBadge status={current.status} />
            </p>
          ) : null}
        </div>
      </header>

      {item.biography ? (
        <section className="fiche-block">
          <h2>Résumé</h2>
          <p>{item.biography}</p>
        </section>
      ) : null}

      <section className="fiche-block">
        <h2>Localisation</h2>
        <p>
          {item.city || "—"}
          {item.country ? ` · ${item.country.flagEmoji} ${item.country.name}` : ""}
        </p>
      </section>

      <section className="fiche-block">
        <h2>Expérience</h2>
        {item.experiences.length ? (
          <ul className="fiche-list">
            {item.experiences.map((experience, index) => (
              <li key={index}>
                <strong>{experience.title}</strong>
                {experience.company ? ` · ${experience.company}` : ""}
                <div className="text-on-surface-variant">
                  {[experience.start, experience.end].filter(Boolean).join(" → ")}
                </div>
                {experience.description ? <p>{experience.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-on-surface-variant">Non renseigné</p>
        )}
      </section>

      <section className="fiche-block">
        <h2>Spécialités</h2>
        <div className="talent-chips">
          {item.specialties.length ? item.specialties.map((tag) => (
            <span key={tag} className="talent-chip">
              {tag}
            </span>
          )) : <p className="text-on-surface-variant">Non renseigné</p>}
        </div>
      </section>

      <section className="fiche-block">
        <h2>Langues</h2>
        {item.languages.length ? (
          <ul className="fiche-list">
            {item.languages.map((language, index) => (
              <li key={index}>
                {language.language} {language.level ? `· ${LEVELS[language.level] ?? language.level}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-on-surface-variant">Non renseigné</p>
        )}
      </section>

      <section className="fiche-block">
        <h2>Disponibilité & salaire</h2>
        <p>{item.availabilityLabel || "Non renseigné"}</p>
        <p>{item.salary ? `${item.salary.amount} ${item.salary.currency}` : "Salaire non renseigné"}</p>
      </section>

      <section className="fiche-block">
        <h2>CV, certifications et vidéos</h2>
        {item.canViewMedia ? (
          <div className="fiche-files">
            {item.cv ? (
              <button type="button" className="ob-secondary" onClick={() => void openFile(item.id, item.cv!.id, item.cv!.name)}>
                Télécharger le CV
              </button>
            ) : null}
            {item.certifications.map((file) => (
              <button key={file.id} type="button" className="ob-secondary" onClick={() => void openFile(item.id, file.id, file.name)}>
                {file.name}
              </button>
            ))}
            {item.videos.map((file) => (
              <button key={file.id} type="button" className="ob-secondary" onClick={() => void openFile(item.id, file.id, file.name)}>
                Vidéo · {file.name}
              </button>
            ))}
            {!item.cv && !item.certifications.length && !item.videos.length ? (
              <p className="text-on-surface-variant">Aucun fichier transmis.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-on-surface-variant">
            {viewerVerified
              ? "Aucun fichier disponible."
              : "Le CV et les vidéos s’affichent une fois votre compte établissement vérifié par l’admin."}
          </p>
        )}
      </section>

      <section className="fiche-block">
        <h2>Contact</h2>
        <p>{item.email}</p>
        {item.phone ? <p>{item.phone}</p> : null}
      </section>

      {modalOpen ? (
        <StartRecruitmentModal
          candidateId={item.id}
          candidateName={item.displayName}
          onClose={() => setModalOpen(false)}
          onStarted={(entry) => {
            setItem({
              ...item,
              inPipeline: true,
              pipelineStatus: entry.status,
              recruitmentId: entry.id,
              recruitments: [
                {
                  id: entry.id,
                  status: entry.status,
                  jobOffer: entry.jobOffer,
                  directRecruitment: entry.directRecruitment,
                  createdAt: entry.createdAt,
                  statusUpdatedAt: entry.statusUpdatedAt,
                },
                ...(item.recruitments ?? []),
              ],
            });
            setModalOpen(false);
            setFlash(`${item.displayName} a été ajoutée à votre pipeline de recrutement.`);
          }}
        />
      ) : null}

      {contactPrompt && current ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setContactPrompt(false)}>
          <div className="fu-modal" role="dialog" onClick={(event) => event.stopPropagation()}>
            <p>Le candidat est actuellement au statut Nouveau. Voulez-vous le passer à Contacté ?</p>
            <div className="ob-country-actions">
              <button className="ob-secondary" type="button" onClick={() => setContactPrompt(false)}>
                Non
              </button>
              <button
                className="ob-primary"
                type="button"
                onClick={() => {
                  void updateRecruitmentStatus(current.id, "CONTACTED").then((updated) => {
                    setItem({
                      ...item,
                      pipelineStatus: updated.status,
                      recruitments: item.recruitments.map((row) => (row.id === updated.id ? { ...row, status: updated.status } : row)),
                    });
                    setFlash(`Statut de ${item.displayName} mis à jour : ${statusLabel("CONTACTED")}.`);
                  });
                  setContactPrompt(false);
                }}
              >
                Passer à Contacté
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
