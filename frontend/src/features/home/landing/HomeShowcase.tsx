import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { peekPath } from "@/features/auth/peek";
import { coachLocation, fetchTopRatedCoaches, topRatedCoachPhotoUrl, type TopCoach } from "@/features/coaching/api";
import { fetchProducts, productPhotoUrl, type ProductCard } from "@/features/marketplace/api";
import { CONTENT_TYPE_LABELS, fetchFormations, formationImageUrl, type FormationCard } from "@/features/academy/api";
import { CONTRACT_TYPES, fetchOpportunityPreview, type OpportunityPreview } from "@/features/jobs/api";

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

function Group({ title, href, count, children }: { title: string; href: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="home-live-group">
      <div className="home-live-group-head">
        <h3>{title}</h3>
        <Link to={href}>Tout voir</Link>
      </div>
      {children}
    </div>
  );
}

export function HomeShowcase() {
  const { user } = useAuth();
  const [data, setData] = useState<Showcase>(EMPTY);
  const [ready, setReady] = useState(false);
  const guest = !user;

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetchTopRatedCoaches(4),
      fetchProducts({ size: 4 }),
      fetchFormations({ size: 3 }),
      fetchOpportunityPreview(4),
    ]).then(([coaches, products, formations, jobs]) => {
      if (cancelled) return;
      setData({
        coaches: coaches.status === "fulfilled" ? coaches.value : [],
        products: products.status === "fulfilled" ? products.value.items : [],
        formations: formations.status === "fulfilled" ? formations.value.items : [],
        jobs: jobs.status === "fulfilled" ? jobs.value : [],
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = data.coaches.length + data.products.length + data.formations.length + data.jobs.length;
  if (ready && total === 0) return null;

  return (
    <section className={guest ? "home-live is-guest" : "home-live"} aria-label="Aperçu de la plateforme">
      <div className="home-wrap">
        <header className="home-head home-live-head">
          <div>
            <p className="home-kicker dark">En ce moment sur le réseau</p>
            <h2>Ce qui se passe, en vrai.</h2>
          </div>
          {guest ? (
            <p className="home-live-note">
              <span className="material-symbols-outlined" aria-hidden="true">
                lock
              </span>
              Aperçu en lecture seule. Connectez-vous pour réserver, commander ou postuler.
            </p>
          ) : null}
        </header>

        <Group title="Coachs les mieux notés" href={guest ? "/coaching" : "/coaches"} count={data.coaches.length}>
          <div className="home-live-grid">
            {data.coaches.map((coach) => (
              <Link className="home-live-card" key={coach.id} to={peekPath(user, `/coaches/${coach.id}`)}>
                <div className="home-live-media">
                  {coach.photoUploadId ? (
                    <img src={topRatedCoachPhotoUrl(coach.id, coach.photoUploadId)} alt="" loading="lazy" />
                  ) : (
                    <span className="home-live-ph">{coach.displayName.slice(0, 1)}</span>
                  )}
                </div>
                <div className="home-live-body">
                  <small>{coach.title ?? "Coach"}</small>
                  <strong>{coach.displayName}</strong>
                  <span>{coachLocation(coach) ?? "En ligne"}</span>
                  <b>
                    ★ {coach.averageRating.toFixed(1)} <em>({coach.reviewCount} avis)</em>
                  </b>
                </div>
              </Link>
            ))}
          </div>
        </Group>

        <Group title="Marketplace" href="/marketplace" count={data.products.length}>
          <div className="home-live-grid">
            {data.products.map((product) => (
              <Link
                className="home-live-card"
                key={product.id}
                to={peekPath(user, `/marketplace/products/${product.id}`)}
              >
                <div className="home-live-media">
                  {product.firstPhotoUploadId ? (
                    <img src={productPhotoUrl(product.id, product.firstPhotoUploadId)} alt="" loading="lazy" />
                  ) : (
                    <span className="home-live-ph">M</span>
                  )}
                </div>
                <div className="home-live-body">
                  <small>{product.categoryName}</small>
                  <strong>{product.name}</strong>
                  <span>{product.supplier?.displayName ?? product.brand ?? "Fournisseur vérifié"}</span>
                  <b>{price(product.priceAmount, product.priceCurrency)}</b>
                </div>
              </Link>
            ))}
          </div>
        </Group>

        <Group title="Académie" href="/academie" count={data.formations.length}>
          <div className="home-live-grid home-live-grid-3">
            {data.formations.map((formation) => (
              <Link
                className="home-live-card"
                key={formation.id}
                to={peekPath(user, `/academie/formations/${formation.id}`)}
              >
                <div className="home-live-media wide">
                  {formation.imageUploadId ? (
                    <img src={formationImageUrl(formation.id, formation.imageUploadId)} alt="" loading="lazy" />
                  ) : (
                    <span className="home-live-ph">A</span>
                  )}
                </div>
                <div className="home-live-body">
                  <small>
                    {CONTENT_TYPE_LABELS[formation.contentType] ?? formation.contentType}
                    {formation.hasCertification ? " · Certifiant" : ""}
                  </small>
                  <strong>{formation.title}</strong>
                  <span>
                    {[shortDate(formation.nextSessionAt), formation.online ? "En ligne" : formation.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <b>{price(formation.priceAmount, formation.priceCurrency)}</b>
                </div>
              </Link>
            ))}
          </div>
        </Group>

        <Group title="Offres Hire Elite" href="/fitness-hire-elite" count={data.jobs.length}>
          <div className="home-live-jobs">
            {data.jobs.map((job) => (
              <Link key={job.id} to={peekPath(user, `/app/opportunities/${job.id}`)}>
                <div>
                  <strong>{job.title}</strong>
                  <span>
                    {job.employerName}
                    {job.location ? ` · ${job.location}` : ""}
                  </span>
                </div>
                <em>{contractLabel(job.contractType)}</em>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {guest ? "lock" : "arrow_forward"}
                </span>
              </Link>
            ))}
          </div>
        </Group>
      </div>
    </section>
  );
}
