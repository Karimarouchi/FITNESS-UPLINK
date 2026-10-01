import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { peekPath } from "@/features/auth/peek";
import { CatalogEmpty, CatalogSkeleton, GuestNudge } from "@/features/home/public/Catalog";
import { PublicCta } from "@/features/home/public/PublicCta";
import { PublicHero } from "@/features/home/public/PublicHero";
import { coachLocation, fetchTopRatedCoaches, topRatedCoachPhotoUrl, type TopCoach } from "../api";

const STEPS = [
  {
    icon: "person_search",
    title: "Choisissez votre coach",
    text: "Spécialités, lieu, avis vérifiés après séance : comparez en toute transparence.",
  },
  {
    icon: "event_available",
    title: "Réservez un créneau",
    text: "Séance à l’unité ou pack 5, 10, mensuel. Paiement et confirmation immédiats.",
  },
  {
    icon: "trending_up",
    title: "Progressez, notez",
    text: "Suivi de vos séances et solde de pack. Votre avis aide toute la communauté.",
  },
];

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className="coach-stars" aria-label={`Note ${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "is-on" : undefined} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}

export function CoachingLandingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<TopCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const browseTo = peekPath(user, "/coaches");

  useEffect(() => {
    let cancelled = false;
    fetchTopRatedCoaches(8)
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
    <article>
      <PublicHero
        kicker="Coaching privé"
        title="La force, en séance."
        lead="Les coachs les mieux notés du réseau. Avis laissés uniquement après une séance réalisée, spécialités visibles, réservation et packs sur le même compte."
        image="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=2000&q=70"
        actions={
          <>
            <Link className="pub-btn pub-btn-lime" to={browseTo}>
              Trouver mon coach
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link className="pub-btn pub-btn-line" to={user ? "/app/dashboard" : "/signup"}>
              {user ? "Tableau de bord" : "Je suis coach"}
            </Link>
          </>
        }
        highlights={[
          { icon: "reviews", label: "Avis 100 % vérifiés" },
          { icon: "calendar_month", label: "Agenda en temps réel" },
          { icon: "inventory", label: "Packs de séances" },
        ]}
      />

      <section className="pub-section">
        <div className="pub-wrap">
          <header className="pub-section-head pub-section-head-row">
            <div>
              <p className="pub-kicker ink">Sélection du réseau</p>
              <h2>Les coachs les mieux notés.</h2>
            </div>
            <Link className="pub-link-arrow" to={browseTo}>
              Voir tous les coachs
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </header>

          {error ? (
            <CatalogEmpty icon="cloud_off" title="Connexion interrompue" text={error} />
          ) : loading ? (
            <CatalogSkeleton count={4} />
          ) : items.length === 0 ? (
            <CatalogEmpty
              icon="sports"
              title="Les premiers avis arrivent"
              text="Les coachs les mieux notés apparaîtront ici dès les premières séances réalisées."
            />
          ) : (
            <div className="cat-grid">
              {items.map((item) => {
                const place = coachLocation(item);
                const quote = item.highlightReview?.comment;
                return (
                  <Link className="cat-card coach-card" to={peekPath(user, `/coaches/${item.id}`)} key={item.id}>
                    <div className="cat-media is-portrait">
                      {item.photoUploadId ? (
                        <img src={topRatedCoachPhotoUrl(item.id, item.photoUploadId)} alt="" loading="lazy" />
                      ) : (
                        <span className="cat-ph cat-ph-initial">{item.displayName.slice(0, 1).toUpperCase()}</span>
                      )}
                      <div className="coach-rating">
                        <b>{item.averageRating.toFixed(1)}</b>
                        <Stars value={item.averageRating} />
                        <small>{item.reviewCount} avis</small>
                      </div>
                    </div>
                    <div className="cat-body">
                      <p className="cat-eyebrow">{item.title || "Coach sportif"}</p>
                      <h3>{item.displayName}</h3>
                      {place ? (
                        <p className="cat-sub">
                          <span className="material-symbols-outlined" aria-hidden="true">
                            location_on
                          </span>
                          {place}
                        </p>
                      ) : null}
                      {(item.specialties ?? []).length ? (
                        <ul className="coach-specs">
                          {item.specialties.slice(0, 3).map((spec) => (
                            <li key={spec}>{spec}</li>
                          ))}
                        </ul>
                      ) : null}
                      {quote ? <blockquote>“{quote}”</blockquote> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!user && items.length > 0 ? (
            <GuestNudge
              redirect="/coaches"
              text="Profils complets, disponibilités, tarifs et réservation de séances : tout s’ouvre avec un compte gratuit."
            />
          ) : null}
        </div>
      </section>

      <section className="pub-section pub-section-tint">
        <div className="pub-wrap">
          <header className="pub-section-head">
            <p className="pub-kicker ink">Comment ça marche</p>
            <h2>De la recherche à la séance, en trois temps.</h2>
          </header>
          <ol className="pub-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="pub-step-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="pub-step-icon material-symbols-outlined" aria-hidden="true">
                  {step.icon}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <PublicCta
        kicker="Vous êtes coach ?"
        title="Remplissez votre agenda."
        lead="Services, tarifs, packs et disponibilités. Les clients du réseau vous trouvent, réservent et paient — vous coachez."
        primaryTo={user ? "/app/dashboard" : "/signup"}
        primaryLabel={user ? "Tableau de bord" : "Créer mon profil coach"}
        secondaryTo="/tarifs"
        secondaryLabel="Voir les tarifs"
      />
    </article>
  );
}
