import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified } from "@/features/auth/types";
import { StartRecruitmentModal } from "@/features/recruitment/StartRecruitmentModal";
import { pipelineTone, statusLabel, updateRecruitmentStatus, type RecruitmentSummary } from "@/features/recruitment/api";
import {
  candidateLocation,
  favoriteCandidate,
  fetchCandidate,
  unfavoriteCandidate,
  type CandidateDetail,
} from "../api";
import { CandidatePhoto } from "../CandidatePhoto";
import { DocumentPreview } from "@/shared/components/DocumentPreview";

const LEVELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  native: "Natif",
};

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
    return <Navigate to="/app/dashboard" replace />;
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
    return (
      <section>
        <Link className="contract-back" to="/candidates">
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_back
          </span>
          Tous les talents
        </Link>
        <p className="auth-error">{error}</p>
      </section>
    );
  }
  if (!item) {
    return <p className="empty-hint">Chargement de la fiche…</p>;
  }

  const current = latestRecruitment(item);
  const canRecruit = isBusiness(user);
  const place = candidateLocation(item);
  const files = [
    item.cv ? { ...item.cv, kind: "CV" } : null,
    ...item.certifications.map((file) => ({ ...file, kind: "Certification" })),
    ...item.videos.map((file) => ({ ...file, kind: "Vidéo" })),
  ].filter(Boolean) as { id: string; name: string; kind: string }[];

  return (
    <section>
      <Link className="contract-back" to="/candidates">
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
        Tous les talents
      </Link>
      {flash ? <p className="fu-flash">{flash}</p> : null}

      <div className="profile-banner">
        <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={76} />
        <div className="profile-banner-copy">
          <div className="pn">{item.displayName}</div>
          <div className="pt">{item.title || "Candidat"}</div>
          <div className="ploc">{place || "Lieu non renseigné"}</div>
          <div className="tag-row">
            {item.verified ? <Badge>Compte vérifié</Badge> : <Badge variant="pending">Compte non vérifié</Badge>}
            {current ? <StatusPill tone={pipelineTone(current.status)}>{statusLabel(current.status)}</StatusPill> : null}
            {item.specialties.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          {canRecruit ? (
            <div className="profile-banner-actions">
              <Button variant={item.favorite ? "primary" : "outline"} type="button" onClick={() => void toggleFavorite()}>
                {item.favorite ? "Favori" : "Ajouter aux favoris"}
              </Button>
              <Button variant="outline" type="button" onClick={contact}>
                Contacter
              </Button>
              {current ? (
                <Button variant="primary" to="/pipeline">
                  Voir le recrutement
                </Button>
              ) : (
                <Button variant="primary" type="button" onClick={() => setModalOpen(true)}>
                  Démarrer le recrutement
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {item.biography ? (
        <Panel title="Résumé" body>
          <p className="bio-copy">{item.biography}</p>
        </Panel>
      ) : null}

      <Panel title="Profil">
        <div className="info-grid">
          <div className="info-cell">
            <div className="k">Localisation</div>
            <div className="v">{place || "Non renseigné"}</div>
          </div>
          <div className="info-cell">
            <div className="k">Disponibilité</div>
            <div className="v">{item.availabilityLabel || "Non renseigné"}</div>
          </div>
          <div className="info-cell">
            <div className="k">Salaire</div>
            <div className="v">{item.salary ? `${item.salary.amount} ${item.salary.currency}` : "Non renseigné"}</div>
          </div>
          <div className="info-cell">
            <div className="k">E-mail</div>
            <div className="v">{item.email}</div>
          </div>
          <div className="info-cell">
            <div className="k">Téléphone</div>
            <div className="v">{item.phone || "Non renseigné"}</div>
          </div>
          <div className="info-cell">
            <div className="k">Langues</div>
            <div className="v">
              {item.languages.length
                ? item.languages
                    .map((language) => [language.language, language.level ? LEVELS[language.level] ?? language.level : null].filter(Boolean).join(" "))
                    .join(" · ")
                : "Non renseigné"}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Expérience">
        {item.experiences.length ? (
          <ul className="experience-list">
            {item.experiences.map((experience, index) => (
              <li key={index}>
                <strong>{experience.title || "Expérience"}</strong>
                <div className="s">
                  {[experience.company, [experience.start, experience.end].filter(Boolean).join(" → ")].filter(Boolean).join(" · ")}
                </div>
                {experience.description ? <p>{experience.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="jobs-empty">
            <strong>Vide</strong>
            <span>Aucune expérience n’est renseignée sur ce profil.</span>
          </p>
        )}
      </Panel>

      <Panel title="Documents">
        {item.canViewMedia ? (
          files.length ? (
            <div className="verify-files is-padded">
              {files.map((file) => (
                <DocumentPreview key={file.id} file={file} candidateId={item.id} />
              ))}
            </div>
          ) : (
            <p className="jobs-empty">
              <strong>Aucun fichier</strong>
              <span>Ce candidat n’a pas encore transmis de CV, certification ou vidéo.</span>
            </p>
          )
        ) : (
          <p className="empty-hint">
            {viewerVerified
              ? "Aucun fichier disponible."
              : "Le CV et les vidéos s’affichent une fois votre compte établissement vérifié par l’admin."}
          </p>
        )}
      </Panel>

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
              <Button variant="outline" type="button" onClick={() => setContactPrompt(false)}>
                Non
              </Button>
              <Button
                variant="primary"
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
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
