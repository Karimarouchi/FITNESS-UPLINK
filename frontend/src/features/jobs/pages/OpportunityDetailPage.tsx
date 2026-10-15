import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { can, useBilling } from "@/features/billing/useBilling";
import { useOwnProfile } from "@/features/me/ownProfile";
import { ApiError } from "@/shared/api/client";
import { ApplyModal } from "../ApplyModal";
import { CONTRACT_TYPES, fetchOpportunities, fetchOpportunity, type Opportunity } from "../api";

function contractLabel(value: string | null) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function dateFr(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/** Whole days from today until the date (negative when past). */
function daysUntil(value: string) {
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const billing = useBilling();
  const { profile } = useOwnProfile();
  const canApply = can(billing, "hire.apply");
  const [item, setItem] = useState<Opportunity | null>(null);
  const [others, setOthers] = useState<Opportunity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    setItem(null);
    setError(null);
    fetchOpportunity(id)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Offre introuvable."));
    fetchOpportunities()
      .then((list) => setOthers(list.filter((offer) => offer.id !== id && !offer.applied).slice(0, 3)))
      .catch(() => setOthers([]));
  }, [id]);

  if (error) {
    return (
      <section className="ofx">
        <Link className="ofx-back" to="/app/opportunities">
          <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          Toutes les offres
        </Link>
        <div className="tlx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">search_off</span>
          <strong>Offre introuvable</strong>
          <p>{error}</p>
          <Link className="tlx-btn is-primary" to="/app/opportunities">
            Voir les offres
          </Link>
        </div>
      </section>
    );
  }
  if (!item) {
    return (
      <section className="ofx" aria-busy="true">
        <div className="pdx-skeleton" style={{ height: 220, margin: 0 }} />
        <div className="pdx-skeleton" style={{ height: 160, margin: 0 }} />
      </section>
    );
  }

  const salary = item.salaryAmount ? `${item.salaryAmount} ${item.salaryCurrency ?? ""}`.trim() : null;
  const place = [item.location, item.employerCountry ? `${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : null]
    .filter(Boolean)
    .join(" · ");
  const left = item.expiresAt ? daysUntil(item.expiresAt) : null;
  const expired = left !== null && left < 0;
  const paragraphs = (item.description ?? "").split(/\n{1,}/).map((line) => line.trim()).filter(Boolean);

  const facts = [
    { icon: "description", label: "Contrat", value: contractLabel(item.contractType) },
    { icon: "payments", label: "Rémunération", value: salary },
    { icon: "location_on", label: "Lieu", value: place || null },
    { icon: "workspace_premium", label: "Expérience", value: item.experience },
    { icon: "badge", label: "Poste", value: item.position },
    { icon: "calendar_today", label: "Publiée le", value: dateFr(item.createdAt) },
  ].filter((fact) => fact.value);

  const dossier = [
    { label: "CV", done: Boolean(profile?.cv), to: "/app/cv" },
    { label: "Titre et ville", done: Boolean(profile?.title && profile?.city), to: "/app/profile/edit" },
    { label: "Présentation", done: Boolean(profile?.biography), to: "/app/profile/edit" },
    { label: "Diplôme ou certification", done: (profile?.diplomas.length ?? 0) + (profile?.certifications.length ?? 0) > 0, to: "/app/certifications" },
  ];
  const missing = dossier.filter((entry) => !entry.done).length;

  function applyBlock() {
    if (item?.applied) {
      return (
        <>
          <p className="ofx-state is-ok">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            Candidature envoyée
          </p>
          <p>L’employeur examine votre dossier avant de l’ajouter à son pipeline.</p>
          <Link className="ofx-btn" to="/app/applications">
            Suivre ma candidature
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </Link>
        </>
      );
    }
    if (expired) {
      return (
        <p className="ofx-state">
          <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
          Cette offre a expiré.
        </p>
      );
    }
    if (!canApply) {
      return (
        <>
          <p>Postuler est inclus dans votre catalogue Talent.</p>
          <Link className="ofx-btn" to="/app/profile/plan">
            Voir les offres
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </Link>
        </>
      );
    }
    return (
      <>
        <p>Un clic envoie votre profil. La lettre de motivation est optionnelle.</p>
        <button className="ofx-btn is-primary" type="button" onClick={() => setApplyOpen(true)}>
          <span className="material-symbols-outlined" aria-hidden="true">send</span>
          Postuler
        </button>
      </>
    );
  }

  return (
    <section className="ofx">
      <Link className="ofx-back" to="/app/opportunities">
        <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        Toutes les offres
      </Link>
      {flash ? <p className="fu-flash" role="status">{flash}</p> : null}

      <header className="pdx-hero ofx-hero">
        <div className="ofx-hero-main">
          <span className="ofx-mark" aria-hidden="true">{initials(item.employerName || item.title)}</span>
          <div>
            <p className="pdx-kicker">{item.employerName}</p>
            <h1>{item.title}</h1>
            <div className="pdx-badges">
              {item.contractType ? <span className="pdx-chip">{contractLabel(item.contractType)}</span> : null}
              {salary ? <span className="pdx-chip is-lime">{salary}</span> : null}
              {place ? <span className="pdx-chip">{place}</span> : null}
              {left !== null && !expired ? (
                <span className={left <= 7 ? "pdx-chip is-warn" : "pdx-chip"}>
                  {left === 0 ? "Dernier jour" : `${left} jour${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {!item.applied && !expired && canApply ? (
          <button className="pdx-cta" type="button" onClick={() => setApplyOpen(true)}>
            <span className="material-symbols-outlined" aria-hidden="true">send</span>
            Postuler maintenant
          </button>
        ) : item.applied ? (
          <span className="pdx-chip is-lime">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span> Déjà postulé
          </span>
        ) : null}
      </header>

      <div className="ofx-facts">
        {facts.map((fact, index) => (
          <div key={fact.label} className="ofx-fact" style={{ "--i": index } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">{fact.icon}</span>
            <small>{fact.label}</small>
            <b>{fact.value}</b>
          </div>
        ))}
      </div>

      <div className="pdx-cols">
        <div className="pdx-main">
          <section className="pdx-card">
            <header>
              <h2>Le poste</h2>
            </header>
            <div className="ofx-body">
              {paragraphs.length ? (
                paragraphs.map((line, index) => <p key={index}>{line}</p>)
              ) : (
                <p className="ofx-muted">L’employeur n’a pas encore détaillé les missions de ce poste.</p>
              )}
            </div>
          </section>

          {item.languages.length || item.certifications.length ? (
            <section className="pdx-card">
              <header>
                <h2>Profil recherché</h2>
              </header>
              <div className="ofx-body">
                {item.languages.length ? (
                  <>
                    <h3 className="ofx-sub">Langues</h3>
                    <div className="tlx-chips">
                      {item.languages.map((tag) => (
                        <span key={tag} className="tlx-chip">{tag}</span>
                      ))}
                    </div>
                  </>
                ) : null}
                {item.certifications.length ? (
                  <>
                    <h3 className="ofx-sub">Certifications souhaitées</h3>
                    <div className="tlx-chips">
                      {item.certifications.map((tag) => (
                        <span key={tag} className="tlx-chip">{tag}</span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="pdx-card">
            <header>
              <h2>L’employeur</h2>
            </header>
            <div className="ofx-employer">
              <span className="ofx-mark is-small" aria-hidden="true">{initials(item.employerName)}</span>
              <div>
                <strong>{item.employerName}</strong>
                <small>{item.employerCountry ? `${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : "Salle / studio partenaire"}</small>
              </div>
            </div>
          </section>
        </div>

        <aside className="pdx-side">
          <div className="ofx-sticky">
            <section className="pdx-card ofx-apply">{applyBlock()}</section>

            {!item.applied ? (
              <section className="pdx-card">
                <header>
                  <h2>Votre dossier</h2>
                  <span>{missing === 0 ? "Complet" : `${missing} à compléter`}</span>
                </header>
                <ul className="pdx-check">
                  {dossier.map((entry) => (
                    <li key={entry.label} className={entry.done ? "is-done" : ""}>
                      <Link to={entry.to}>
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {entry.done ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        {entry.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {item.expiresAt ? (
              <p className="ofx-expiry">
                <span className="material-symbols-outlined" aria-hidden="true">event</span>
                {expired ? "Expirée le " : "Candidatures ouvertes jusqu’au "}
                {dateFr(item.expiresAt)}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {others.length ? (
        <section className="pdx-card ofx-more">
          <header>
            <h2>Autres offres</h2>
            <Link to="/app/opportunities">Tout voir</Link>
          </header>
          <ul className="ofx-more-list">
            {others.map((offer) => (
              <li key={offer.id}>
                <Link to={`/app/opportunities/${offer.id}`}>
                  <span className="ofx-mark is-small" aria-hidden="true">{initials(offer.employerName || offer.title)}</span>
                  <span className="ofx-more-copy">
                    <strong>{offer.title}</strong>
                    <small>
                      {offer.employerName}
                      {offer.location ? ` · ${offer.location}` : ""}
                    </small>
                  </span>
                  {offer.salaryAmount ? <b>{offer.salaryAmount} {offer.salaryCurrency}</b> : null}
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {applyOpen ? (
        <ApplyModal
          offer={item}
          onClose={() => setApplyOpen(false)}
          onApplied={() => {
            setItem({ ...item, applied: true });
            setApplyOpen(false);
            setFlash("Candidature envoyée.");
          }}
        />
      ) : null}
    </section>
  );
}
