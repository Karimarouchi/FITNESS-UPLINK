import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import {
  CONTENT_TYPE_LABELS,
  fetchFormationDetail,
  formationImageUrl,
  registerForSession,
  type FormationDetail,
} from "../api";

export function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchFormationDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function register(sessionId: string) {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/academie/formations/${id}`)}`);
      return;
    }
    setError(null);
    setRegistering(sessionId);
    try {
      const registration = await registerForSession(sessionId);
      setDone(registration.status === "WAITLISTED" ? "waitlisted" : "registered");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de vous inscrire.");
    } finally {
      setRegistering(null);
    }
  }

  if (loading) {
    return null;
  }
  if (!detail) {
    return (
      <section style={{ padding: "48px" }}>
        <p className="jobs-empty">
          <strong>Formation introuvable</strong>
        </p>
      </section>
    );
  }

  const { formation, description, sessions } = detail;
  const canBrowse = !user || hasPermission(user, PERMS.ACADEMY_BROWSE);

  return (
    <section style={{ padding: "48px", maxWidth: 900, margin: "0 auto" }}>
      {formation.imageUploadId ? (
        <img
          src={formationImageUrl(formation.id, formation.imageUploadId)}
          alt={formation.title}
          style={{ width: "100%", maxHeight: 360, objectFit: "cover", marginBottom: 20 }}
        />
      ) : null}
      <div className="page-head">
        <div>
          <h1>{formation.title}</h1>
          <p className="sub">
            {formation.organizer?.name ?? "Organisme"}
            {formation.trainerName ? ` · Formateur : ${formation.trainerName}` : ""}
          </p>
        </div>
      </div>
      <div className="tag-row" style={{ marginBottom: 16 }}>
        <Tag>{CONTENT_TYPE_LABELS[formation.contentType]}</Tag>
        {formation.hasCertification ? <Tag>Certification incluse</Tag> : null}
        {formation.online ? <Tag>En ligne</Tag> : null}
        {formation.language ? <Tag>{formation.language}</Tag> : null}
      </div>
      {description ? <p style={{ lineHeight: 1.6, marginBottom: 20 }}>{description}</p> : null}
      {formation.location ? <p className="muted-line">Lieu : {formation.location}</p> : null}
      <p className="muted-line" style={{ marginBottom: 24 }}>
        {Number(formation.priceAmount) > 0 ? `${formation.priceAmount} ${formation.priceCurrency}` : "Gratuit"}
      </p>

      <div className="panel">
        <div className="panel-head">
          <h2>Sessions</h2>
        </div>
        {!canBrowse ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            L'inscription aux formations est réservée aux membres.
          </p>
        ) : sessions.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucune session programmée pour le moment.
          </p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="booking-item">
              <div className="booking-time">
                {new Date(session.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
              </div>
              <div className="booking-body">
                <div className="t">{session.durationMinutes} min</div>
                <div className="s">
                  {session.seatsLeft > 0 ? `${session.seatsLeft} places restantes` : "Complet — liste d'attente"}
                </div>
              </div>
              {done === "registered" ? (
                <span className="empty-hint">Inscription envoyée</span>
              ) : done === "waitlisted" ? (
                <span className="empty-hint">Sur liste d'attente</span>
              ) : (
                <Button variant="mini" disabled={registering !== null} onClick={() => void register(session.id)}>
                  {registering === session.id ? "…" : session.seatsLeft > 0 ? "S'inscrire" : "Liste d'attente"}
                </Button>
              )}
            </div>
          ))
        )}
        {error ? <p className="auth-error" style={{ padding: "0 22px 14px" }}>{error}</p> : null}
      </div>
    </section>
  );
}
