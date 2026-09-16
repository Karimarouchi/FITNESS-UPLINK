import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { Tag } from "@/components/ui/Tag";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified } from "@/features/auth/types";
import { can, useBilling } from "@/features/billing/useBilling";
import { ApiError } from "@/shared/api/client";
import { StartRecruitmentModal } from "@/features/recruitment/StartRecruitmentModal";
import { openHireChat } from "@/features/recruitment/openHireChat";
import {
  opportunityLabel,
  pipelineTone,
  recruitmentError,
  startRecruitment,
  statusLabel,
  updateRecruitmentStatus,
  type RecruitmentSummary,
} from "@/features/recruitment/api";
import {
  candidateLocation,
  favoriteCandidate,
  fetchCandidate,
  fetchCandidateFile,
  unfavoriteCandidate,
  type CandidateDetail,
  type FileRef,
} from "../api";
import { CandidatePhoto } from "../CandidatePhoto";

const LEVELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  native: "Natif",
};

type ListedFile = FileRef & { kind: string };

function latestRecruitment(item: CandidateDetail): RecruitmentSummary | null {
  return item.recruitments?.[0] ?? null;
}

function formatSize(bytes: number) {
  if (!bytes) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} Ko`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function listedFiles(item: CandidateDetail): ListedFile[] {
  return [
    item.cv ? { ...item.cv, kind: "CV" } : null,
    ...item.diplomas.map((file) => ({ ...file, kind: "Diplôme" })),
    ...item.certifications.map((file) => ({ ...file, kind: "Certification" })),
  ].filter(Boolean) as ListedFile[];
}

function CandidateFileRow({ candidateId, file }: { candidateId: string; file: ListedFile }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadBlob() {
    setError(null);
    return fetchCandidateFile(candidateId, file.id);
  }

  async function view() {
    setBusy("view");
    try {
      const blob = await loadBlob();
      const url = URL.createObjectURL(blob);
      const tab = window.open(url, "_blank", "noopener");
      if (tab) {
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return null;
        });
      } else {
        setPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          return url;
        });
      }
    } catch {
      setError("Impossible d’ouvrir ce fichier.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    try {
      const blob = await loadBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
    } catch {
      setError("Impossible de télécharger ce fichier.");
    } finally {
      setBusy(null);
    }
  }

  const size = formatSize(file.size);

  return (
    <div className="hire-file-row">
      <div className="hire-file-meta">
        <span className="hire-file-kind">{file.kind}</span>
        <div className="hire-file-copy">
          <strong>{file.name}</strong>
          {size ? <span>{size}</span> : null}
        </div>
      </div>
      <div className="hire-file-actions">
        <Button variant="outline" type="button" disabled={busy !== null} onClick={() => void view()}>
          {busy === "view" ? "Ouverture…" : "Voir"}
        </Button>
        <Button variant="outline" type="button" disabled={busy !== null} onClick={() => void download()}>
          {busy === "download" ? "Téléchargement…" : "Télécharger"}
        </Button>
      </div>
      {error ? <p className="hire-file-error">{error}</p> : null}
      {previewUrl ? (
        <div className="hire-file-preview">
          <p>Le fichier s’affiche ici car le navigateur a bloqué l’onglet.</p>
          {(file.contentType ?? "").startsWith("video/") ? (
            <video src={previewUrl} controls playsInline />
          ) : (file.contentType ?? "").startsWith("image/") ? (
            <img src={previewUrl} alt={file.name} />
          ) : (
            <iframe title={file.name} src={previewUrl} />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CandidateDetailPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const billing = useBilling();
  const canContact = can(billing, "hire.contact");
  const canFavorite = can(billing, "hire.favorites");
  const [item, setItem] = useState<CandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const viewerVerified = isVerified(user);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

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
  if (!isSuperAdmin(user) && !isVerified(user)) {
    return <Navigate to="/candidates" replace />;
  }

  async function contact() {
    if (!item) {
      return;
    }
    setContactBusy(true);
    try {
      let recruitment = latestRecruitment(item);
      if (!recruitment) {
        const created = await startRecruitment({ candidateId: item.id });
        recruitment = {
          id: created.id,
          status: created.status,
          jobOffer: created.jobOffer,
          directRecruitment: created.directRecruitment,
          createdAt: created.createdAt,
          statusUpdatedAt: created.statusUpdatedAt,
        };
      }
      const updated =
        recruitment.status === "APPLIED" || recruitment.status === "NEW"
          ? await updateRecruitmentStatus(recruitment.id, "CONTACTED")
          : recruitment;
      setItem({
        ...item,
        inPipeline: true,
        pipelineStatus: updated.status,
        recruitmentId: updated.id,
        recruitments: [
          {
            id: updated.id,
            status: updated.status,
            jobOffer: updated.jobOffer,
            directRecruitment: updated.directRecruitment,
            createdAt: updated.createdAt,
            statusUpdatedAt: updated.statusUpdatedAt,
          },
          ...(item.recruitments ?? []).filter((row) => row.id !== updated.id),
        ],
      });
      openHireChat({
        id: updated.id,
        peerName: item.displayName,
        title: opportunityLabel(updated),
      });
      setFlash(`${item.displayName} : discussion ouverte.`);
    } catch (err) {
      setFlash(err instanceof ApiError ? recruitmentError(err.message) : "Impossible de contacter ce candidat.");
    } finally {
      setContactBusy(false);
    }
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

  if (error) {
    return (
      <section className="hire-page">
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
  const files = listedFiles(item);

  return (
    <section className="hire-page hire-fiche">
      <Link className="contract-back" to="/candidates">
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
        Tous les talents
      </Link>
      {flash ? <p className="fu-flash">{flash}</p> : null}

      <div className="profile-banner hire-fiche-banner">
        <CandidatePhoto candidateId={item.id} uploadId={item.photoUploadId} name={item.displayName} size={88} />
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
        </div>
        {canRecruit ? (
          <div className="profile-banner-actions">
            {canFavorite ? (
              <Button variant={item.favorite ? "primary" : "outline"} type="button" onClick={() => void toggleFavorite()}>
                {item.favorite ? "Favori" : "Ajouter aux favoris"}
              </Button>
            ) : null}
            {current?.status !== "REJECTED" && current?.status !== "ARCHIVED" ? (
              canContact ? (
                <Button variant="primary" type="button" disabled={contactBusy} onClick={() => void contact()}>
                  {contactBusy ? "…" : "Contacter"}
                </Button>
              ) : (
                <Button variant="outline" to="/app/profile/plan">
                  Débloquer Contacter
                </Button>
              )
            ) : null}
            {current ? (
              <Button variant="outline" to="/applications">
                {current.status === "APPLIED" ? "Voir la candidature" : "Voir le recrutement"}
              </Button>
            ) : canContact ? (
              <Button variant="outline" type="button" onClick={() => setModalOpen(true)}>
                Ajouter au pipeline
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="hire-fiche-body">
        <div className="hire-fiche-main">
          {item.biography ? (
            <Panel title="Résumé" body>
              <p className="bio-copy">{item.biography}</p>
            </Panel>
          ) : null}

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
        </div>

        <aside className="hire-fiche-side">
          <Panel title="Profil">
            <div className="info-grid hire-fiche-facts">
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

          <Panel title="Documents">
            {item.canViewMedia ? (
              files.length ? (
                <div className="hire-file-list">
                  <p className="hire-file-hint">Les fichiers ne s’ouvrent que si vous cliquez sur Voir ou Télécharger.</p>
                  {files.map((file) => (
                    <CandidateFileRow key={file.id} candidateId={item.id} file={file} />
                  ))}
                </div>
              ) : (
                <p className="jobs-empty">
                  <strong>Aucun fichier</strong>
                  <span>Ce candidat n’a pas encore transmis de CV, diplôme ou certification.</span>
                </p>
              )
            ) : (
              <p className="empty-hint">
                {viewerVerified
                  ? "Aucun fichier disponible."
                  : "Le CV s’affiche une fois votre compte établissement vérifié par l’admin."}
              </p>
            )}
          </Panel>

          <Panel title="Vidéos de présentation">
            {item.canViewMedia ? (
              item.videos.length ? (
                <div className="video-grid">
                  {item.videos.map((url) => (
                    <a key={url} className="video-card" href={url} target="_blank" rel="noreferrer">
                      <div className="play">▶</div>
                      <div className="cap">{url}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="empty-hint">Ce candidat n’a pas encore ajouté de lien vidéo.</p>
              )
            ) : (
              <p className="empty-hint">
                {viewerVerified
                  ? "Aucune vidéo disponible."
                  : "Les vidéos s’affichent une fois votre compte établissement vérifié par l’admin."}
              </p>
            )}
          </Panel>
        </aside>
      </div>

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
    </section>
  );
}
