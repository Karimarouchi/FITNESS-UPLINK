import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { peekPath } from "@/features/auth/peek";
import { coachLocation, fetchTopRatedCoaches, topRatedCoachPhotoUrl, type TopCoach } from "@/features/coaching/api";
import { fetchProducts, productPhotoUrl, type ProductCard } from "@/features/marketplace/api";
import { CONTENT_TYPE_LABELS, fetchFormations, formationImageUrl, type FormationCard } from "@/features/academy/api";
import { CONTRACT_TYPES, fetchOpportunityPreview, type OpportunityPreview } from "@/features/jobs/api";
import { VtButton, VtHead, VtTitle } from "./Vantage";

type Showcase = {
  coaches: TopCoach[];
  products: ProductCard[];
  formations: FormationCard[];
  jobs: OpportunityPreview[];
};

const EMPTY: Showcase = { coaches: [], products: [], formations: [], jobs: [] };

function price(amount: string | null, currency: string | null) {
  if (amount == null || Number(amount) <= 0) return "Sur devis";
  return `${new Intl.NumberFormat("fr-FR").format(Number(amount))} ${currency ?? ""}`.trim();
}

function shortDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function contractLabel(value: string | null) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? value ?? "";
}

function Initial({ value }: { value: string }) {
  return <span className="vt-card-ph">{value.slice(0, 1).toUpperCase()}</span>;
}

export function HomeShowcase() {
  const { user } = useAuth();
  const [data, setData] = useState<Showcase>(EMPTY);
  const guest = !user;

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchTopRatedCoaches(4),
      fetchProducts({ size: 4 }),
      fetchFormations({ size: 4 }),
      fetchOpportunityPreview(4),
    ]).then(([coaches, products, formations, jobs]) => {
      if (cancelled) return;
      setData({
        coaches: coaches.status === "fulfilled" ? coaches.value : [],
        products: products.status === "fulfilled" ? products.value.items : [],
        formations: formations.status === "fulfilled" ? formations.value.items : [],
        jobs: jobs.status === "fulfilled" ? jobs.value : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {data.coaches.length ? (
        <section className="vt-section" aria-label="Coachs">
          <div className="vt-wrap">
            <VtHead title={<VtTitle lines={["Les coachs"]} muted="du réseau." />}>
              <p>
                Les coachs les mieux notés de Fitness Universe. Chaque avis est laissé après une séance réalisée — la note
                se gagne sur le terrain.
              </p>
            </VtHead>
            <div className="vt-cards">
              {data.coaches.map((coach) => (
                <Link className="vt-card" key={coach.id} to={peekPath(user, `/coaches/${coach.id}`)}>
                  <div className="vt-card-media">
                    {coach.photoUploadId ? (
                      <img src={topRatedCoachPhotoUrl(coach.id, coach.photoUploadId)} alt="" loading="lazy" />
                    ) : (
                      <Initial value={coach.displayName} />
                    )}
                    {guest ? <span className="vt-lock">Membres</span> : null}
                  </div>
                  <strong>{coach.displayName}</strong>
                  <small>
                    {coach.title ?? "Coach"} · ★ {coach.averageRating.toFixed(1)}
                  </small>
                  <small>{coachLocation(coach) || "En ligne"}</small>
                </Link>
              ))}
            </div>
            <VtButton to={guest ? "/coaching" : "/coaches"}>Voir tous les coachs</VtButton>
          </div>
        </section>
      ) : null}

      {data.formations.length ? (
        <section className="vt-section vt-section-white" aria-label="Académie">
          <div className="vt-wrap">
            <VtHead title={<VtTitle lines={["Former"]} muted="la force." />}>
              <p>Certifications, workshops et masterclass animés par les académies du réseau. Sessions, places, inscription.</p>
            </VtHead>
            <div className="vt-cards">
              {data.formations.map((formation) => (
                <Link
                  className="vt-card"
                  key={formation.id}
                  to={peekPath(user, `/academie/formations/${formation.id}`)}
                >
                  <div className="vt-card-media is-wide">
                    {formation.imageUploadId ? (
                      <img src={formationImageUrl(formation.id, formation.imageUploadId)} alt="" loading="lazy" />
                    ) : (
                      <Initial value={formation.title} />
                    )}
                    {formation.hasCertification ? <span className="vt-tag">Certifiant</span> : null}
                  </div>
                  <strong>{formation.title}</strong>
                  <small>
                    {CONTENT_TYPE_LABELS[formation.contentType] ?? formation.contentType}
                    {formation.nextSessionAt ? ` · ${shortDate(formation.nextSessionAt)}` : ""}
                  </small>
                  <small className="vt-price">{price(formation.priceAmount, formation.priceCurrency)}</small>
                </Link>
              ))}
            </div>
            <VtButton to="/academie">Voir toutes les formations</VtButton>
          </div>
        </section>
      ) : null}

      {data.products.length ? (
        <section className="vt-section" aria-label="Marketplace">
          <div className="vt-wrap">
            <VtHead title={<VtTitle lines={["Équiper"]} muted="la salle." />}>
              <p>Musculation, cardio, HYROX, récupération. Les catalogues des fournisseurs vérifiés, sur demande de devis.</p>
            </VtHead>
            <div className="vt-cards">
              {data.products.map((product) => (
                <Link className="vt-card" key={product.id} to={peekPath(user, `/marketplace/products/${product.id}`)}>
                  <div className="vt-card-media is-square">
                    {product.firstPhotoUploadId ? (
                      <img src={productPhotoUrl(product.id, product.firstPhotoUploadId)} alt="" loading="lazy" />
                    ) : (
                      <Initial value={product.name} />
                    )}
                  </div>
                  <strong>{product.name}</strong>
                  <small>{product.supplier?.displayName ?? product.brand ?? product.categoryName}</small>
                  <small className="vt-price">{price(product.priceAmount, product.priceCurrency)}</small>
                </Link>
              ))}
            </div>
            <VtButton to="/marketplace">Parcourir le catalogue</VtButton>
          </div>
        </section>
      ) : null}

      {data.jobs.length ? (
        <section className="vt-section vt-section-white" aria-label="Offres Hire Elite">
          <div className="vt-wrap">
            <VtHead title={<VtTitle lines={["Les offres"]} muted="Hire Elite." />}>
              <p>
                Salles, clubs et studios recrutent en ce moment.{" "}
                {guest ? "Connectez-vous pour postuler." : "Postulez depuis votre dossier."}
              </p>
            </VtHead>
            <div className="vt-rows">
              {data.jobs.map((job) => (
                <Link key={job.id} to={peekPath(user, `/app/opportunities/${job.id}`)}>
                  <strong>{job.title}</strong>
                  <span>
                    {job.employerName}
                    {job.location ? ` · ${job.location}` : ""}
                  </span>
                  <em>{contractLabel(job.contractType)}</em>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {guest ? "lock" : "north_east"}
                  </span>
                </Link>
              ))}
            </div>
            <VtButton to="/fitness-hire-elite">Découvrir Hire Elite</VtButton>
          </div>
        </section>
      ) : null}
    </>
  );
}
