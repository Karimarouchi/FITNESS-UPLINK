import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { PublicAuthActions } from "@/components/layout/PublicAuthActions";
import { useAuth } from "@/features/auth/AuthContext";
import { coachLocation, fetchTopRatedCoaches, topRatedCoachPhotoUrl, type TopCoach } from "../api";
import { RatingStars } from "../RatingStars";
import "@/features/home/home.css";

const ease = [0.16, 1, 0.3, 1] as const;

export function CoachingLandingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TopCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTopRatedCoaches(6)
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les coachs pour le moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="fu-page">
      <header className="fu-page-head">
        <h1 className="fu-page-title">Coaching</h1>
        <p className="fu-page-lead">
          Découvrez les coachs les mieux notés de la communauté Fitness Universe : avis vérifiés, spécialités et prise de
          contact directe.
        </p>
        <div className="fu-page-actions">
          <PublicAuthActions ghostClass="fu-btn fu-btn--outline" solidClass="fu-btn fu-btn--lime" />
        </div>
      </header>

      {error ? <p className="auth-error mt-6">{error}</p> : null}

      {!loading && items.length === 0 && !error ? (
        <p className="jobs-empty">
          <strong>Pas encore de coach mis en avant</strong>
          <span>Les coachs les mieux notés apparaîtront ici dès qu’ils auront reçu leurs premiers avis.</span>
        </p>
      ) : null}

      {items.length > 0 ? (
        <motion.div
          className="fu-talent-grid"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {items.map((item) => {
            const place = coachLocation(item);
            const contactTo = user
              ? `/coaches/${item.id}`
              : `/login?redirect=${encodeURIComponent(`/coaches/${item.id}`)}`;
            return (
              <motion.article
                key={item.id}
                className="fu-talent-card"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <div className="fu-talent-card-top">
                  {item.photoUploadId ? (
                    <img
                      src={topRatedCoachPhotoUrl(item.id, item.photoUploadId)}
                      alt={item.displayName}
                      style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--fu-surface-2, #1e1e1e)",
                        fontWeight: 600,
                      }}
                    >
                      {item.displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="pn">{item.displayName}</div>
                    <div className="pt">{item.title || "Coach sportif"}</div>
                    <div className="ploc">{place || "Lieu non renseigné"}</div>
                  </div>
                </div>
                <RatingStars value={item.averageRating} count={item.reviewCount} />
                <div className="tag-row">
                  {(item.specialties ?? []).slice(0, 4).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
                {item.highlightReview ? (
                  <blockquote className="fu-talent-meta" style={{ fontStyle: "italic" }}>
                    « {item.highlightReview.comment} »
                    <br />
                    <span style={{ opacity: 0.7 }}>— {item.highlightReview.clientDisplayName}</span>
                  </blockquote>
                ) : null}
                <div className="fu-talent-card-actions">
                  <Button variant="mini" to={contactTo}>
                    Contacter
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      ) : null}
    </article>
  );
}
