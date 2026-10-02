import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { peekPath } from "@/features/auth/peek";
import { fetchTopRatedCoaches, type TopCoach } from "@/features/coaching/api";
import "./hero.css";

export function HomeHero() {
  const { user } = useAuth();
  const [trainer, setTrainer] = useState<TopCoach | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTopRatedCoaches(1)
      .then((coaches) => {
        if (!cancelled) setTrainer(coaches[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryTo = user ? "/app/dashboard" : "/signup";
  const primaryLabel = user ? "Mon tableau de bord" : "Rejoindre le réseau";
  const trainerTo = trainer ? peekPath(user, `/coaches/${trainer.id}`) : "/coaching";

  return (
    <section className="hx" aria-label="Fitness Universe">
      <img className="hx-layer hx-bg" src="/media/hero-bg.jpg" alt="" aria-hidden="true" />
      <div className="hx-arcs" aria-hidden="true">
        <span />
        <span />
      </div>

      <h1 className="hx-title">
        <span>Plus forts</span>
        <span>ensemble</span>
      </h1>

      <img className="hx-layer hx-cut" src="/media/Hero1.png" alt="" aria-hidden="true" />

      <div className="hx-ui">
        <div className="hx-cards">
          <p className="hx-pitch">
            {user ? (
              <>
                Bon retour, {user.firstName || user.displayName}. <em>Votre réseau avance</em> : opportunités, séances
                et formations vous attendent.
              </>
            ) : (
              <>
                Recrutement, coaching, formations et matériel. <em>Une seule plateforme</em> pour ceux qui font le
                fitness.
              </>
            )}
          </p>

          <Link className="hx-cta" to={primaryTo}>
            {primaryLabel}
            <span className="hx-cta-ico material-symbols-outlined" aria-hidden="true">
              north_east
            </span>
          </Link>

          <div className="hx-card hx-glass hx-trainer">
            <Link className="hx-trainer-figure" to={trainerTo} aria-hidden="true" tabIndex={-1}>
              <img src="/media/coach-hero.png" alt="" />
            </Link>
            <div className="hx-trainer-body">
              <Link className="hx-trainer-id" to={trainerTo}>
                <small>{trainer ? "Votre coach" : "Coaching privé"}</small>
                <b>{trainer?.displayName ?? "Coachs vérifiés"}</b>
                <span>{trainer?.title ?? "Séances & packs"}</span>
              </Link>
              <div className="hx-trainer-actions">
                {[
                  { icon: "chat_bubble", label: "Message" },
                  { icon: "videocam", label: "Visio" },
                  { icon: "call", label: "Appel" },
                ].map((action) => (
                  <Link key={action.icon} to={trainerTo} aria-label={action.label}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {action.icon}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
