import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import {
  CONTENT_TYPE_LABELS,
  academyErrorMessage,
  fetchFormationDetail,
  fetchMyRegistrations,
  formationImageUrl,
  registerForSession,
  type FormationDetail,
  type Registration,
} from "../api";
import "./formation-detail.css";

function formatPrice(amount: string, currency: string) {
  const value = Number(amount);
  return value > 0 ? `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}` : "Gratuit";
}

export function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [detail, setDetail] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The member's own registration per session (one entry per session, cancelled ones ignored).
  const [mine, setMine] = useState<Record<string, Registration>>({});
  const canBrowse = !user || hasPermission(user, PERMS.ACADEMY_BROWSE);

  const loadDetail = useCallback(() => {
    if (!id) return Promise.resolve();
    return fetchFormationDetail(id)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [id]);

  useEffect(() => {
    void loadDetail().finally(() => setLoading(false));
  }, [loadDetail]);

  useEffect(() => {
    if (!user || !hasPermission(user, PERMS.ACADEMY_BROWSE)) return;
    fetchMyRegistrations()
      .then((rows) => {
        const map: Record<string, Registration> = {};
        rows.filter((row) => row.status !== "CANCELLED").forEach((row) => {
          map[row.sessionId] = row;
        });
        setMine(map);
      })
      .catch(() => undefined);
  }, [user]);

  async function register(sessionId: string) {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/academie/formations/${id}`)}`);
      return;
    }
    setError(null);
    setRegistering(sessionId);
    try {
      const registration = await registerForSession(sessionId);
      setMine((current) => ({ ...current, [sessionId]: registration }));
      // Refresh seat counts (a free formation is confirmed — and takes its seat — right away).
      await loadDetail();
    } catch (err) {
      setError(academyErrorMessage(err, "Impossible de vous inscrire."));
    } finally {
      setRegistering(null);
    }
  }

  if (loading) {
    return null;
  }
  if (!detail) {
    return (
      <section className="fd fd-missing">
        <h1>Formation introuvable</h1>
        <Link className="fd-back" to="/academie">
          ← Retour à l’académie
        </Link>
      </section>
    );
  }

  const { formation, description, sessions } = detail;
  const paid = Number(formation.priceAmount) > 0;

  return (
    <article className="fd">
      <header
        className="fd-hero"
        style={
          formation.imageUploadId
            ? { backgroundImage: `url(${formationImageUrl(formation.id, formation.imageUploadId)})` }
            : undefined
        }
      >
        <div className="fd-wrap fd-hero-inner">
          <Link className="fd-back" to="/academie">
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
            Académie
          </Link>
          <ul className="fd-tags">
            <li className="is-lime">{CONTENT_TYPE_LABELS[formation.contentType]}</li>
            {formation.hasCertification ? <li>Certification incluse</li> : null}
            {formation.online ? <li>En ligne</li> : null}
            {formation.language ? <li>{formation.language}</li> : null}
          </ul>
          <h1>{formation.title}</h1>
          <p className="fd-by">
            {formation.organizer?.name ?? "Organisme"}
            {formation.trainerName ? ` · Formateur : ${formation.trainerName}` : ""}
          </p>
        </div>
      </header>

      <div className="fd-wrap fd-body">
        <div className="fd-main">
          {description ? (
            <section className="fd-block">
              <h2>Le programme</h2>
              <p>{description}</p>
            </section>
          ) : null}

          <section className="fd-block">
            <h2>Sessions</h2>
            {!canBrowse ? (
              <p className="fd-note">L’inscription aux formations est réservée aux membres.</p>
            ) : sessions.length === 0 ? (
              <p className="fd-note">Aucune session ouverte aux inscriptions pour le moment.</p>
            ) : (
              <ul className="fd-sessions">
                {sessions.map((session) => {
                  const date = new Date(session.scheduledAt);
                  const reg = mine[session.id];
                  return (
                    <li key={session.id}>
                      <div className="fd-date">
                        <b>{date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</b>
                        <span>
                          {date.toLocaleDateString("fr-FR", { year: "numeric" })} ·{" "}
                          {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="fd-session-info">
                        <strong>{session.durationMinutes} min</strong>
                        <span className={session.seatsLeft > 0 && session.seatsLeft <= 5 ? "is-hot" : undefined}>
                          {session.seatsLeft > 0
                            ? `${session.seatsLeft} place${session.seatsLeft > 1 ? "s" : ""} sur ${session.capacity}`
                            : "Complet — liste d’attente"}
                        </span>
                      </div>
                      <div className="fd-session-action">
                        {reg?.status === "PENDING_PAYMENT" ? (
                          <>
                            <span className="fd-status">Réservée · à payer</span>
                            <Link className="fd-btn fd-btn-lime" to={`/app/academy/registrations/${reg.id}/pay`}>
                              Payer
                              <span className="material-symbols-outlined" aria-hidden="true">
                                arrow_forward
                              </span>
                            </Link>
                          </>
                        ) : reg?.status === "CONFIRMED" ? (
                          <span className="fd-status is-ok">
                            <span className="material-symbols-outlined" aria-hidden="true">
                              check
                            </span>
                            Inscrit(e)
                          </span>
                        ) : reg?.status === "WAITLISTED" ? (
                          <span className="fd-status">Liste d’attente #{reg.waitlistPosition}</span>
                        ) : (
                          <button
                            className="fd-btn"
                            type="button"
                            disabled={registering !== null}
                            onClick={() => void register(session.id)}
                          >
                            {registering === session.id
                              ? "…"
                              : session.seatsLeft > 0
                                ? "S’inscrire"
                                : "Liste d’attente"}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {error ? <p className="fd-error">{error}</p> : null}
          </section>
        </div>

        <aside className="fd-side">
          <p className="fd-side-kicker">Tarif</p>
          <p className="fd-price">{formatPrice(formation.priceAmount, formation.priceCurrency)}</p>
          <dl>
            <div>
              <dt>Format</dt>
              <dd>{formation.online ? "En ligne" : formation.location || "Présentiel"}</dd>
            </div>
            {formation.language ? (
              <div>
                <dt>Langue</dt>
                <dd>{formation.language}</dd>
              </div>
            ) : null}
            <div>
              <dt>Certification</dt>
              <dd>{formation.hasCertification ? "Incluse" : "Non"}</dd>
            </div>
          </dl>
          {paid ? (
            <p className="fd-side-note">
              Réservez une session, puis payez pour confirmer : la place n’est comptée qu’une fois réglée.
            </p>
          ) : null}
          <Link className="fd-side-link" to="/app/academy/registrations">
            Mes formations
          </Link>
        </aside>
      </div>
    </article>
  );
}
