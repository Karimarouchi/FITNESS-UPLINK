import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { can, useBilling } from "@/features/billing/useBilling";
import { Tag } from "@/components/ui/Tag";
import { ApiError } from "@/shared/api/client";
import { ApplyModal } from "../ApplyModal";
import { CONTRACT_TYPES, fetchOpportunity, type Opportunity } from "../api";

function contractLabel(value: string | null) {
  return CONTRACT_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function OpportunityDetailPage() {
  const { id } = useParams();
  const billing = useBilling();
  const canApply = can(billing, "hire.apply");
  const [item, setItem] = useState<Opportunity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchOpportunity(id)
      .then(setItem)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Offre introuvable."));
  }, [id]);

  if (error) {
    return (
      <section>
        <Link className="contract-back" to="/app/opportunities">
          Toutes les offres
        </Link>
        <p className="auth-error">{error}</p>
      </section>
    );
  }
  if (!item) {
    return <p className="empty-hint">Chargement de l’offre…</p>;
  }

  const salary = item.salaryAmount ? `${item.salaryAmount} ${item.salaryCurrency ?? ""}`.trim() : null;

  return (
    <section className="hire-detail">
      <Link className="contract-back" to="/app/opportunities">
        Toutes les offres
      </Link>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      <header className="hire-hero">
        <p className="font-label-caps uppercase text-on-surface-variant">{item.employerName}</p>
        <h1>{item.title}</h1>
        <p className="sub">
          {[item.position, item.location, item.employerCountry ? `${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="tag-row">
          {item.contractType ? <Tag>{contractLabel(item.contractType)}</Tag> : null}
          {salary ? <Tag>{salary}</Tag> : null}
          {item.experience ? <Tag>{item.experience}</Tag> : null}
          {item.languages.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </header>
      <div className="hire-detail-body">
        <div className="hire-detail-copy">
          <h2>Le poste</h2>
          <p>{item.description || "Aucune description n’a été publiée pour cette offre."}</p>
          {item.certifications.length ? (
            <>
              <h2>Certifications souhaitées</h2>
              <div className="tag-row">
                {item.certifications.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <aside className="hire-apply-bar">
          {item.applied ? (
            <>
              <p>Candidature envoyée. L’employeur examine votre dossier avant de l’ajouter à son pipeline.</p>
              <Button variant="outline" to="/app/applications">
                Voir mes candidatures
              </Button>
            </>
          ) : (
            <>
              {canApply ? (
                <>
                  <p>Un clic envoie votre profil. La lettre de motivation est optionnelle.</p>
                  <Button variant="primary" type="button" onClick={() => setApplyOpen(true)}>
                    Postuler
                  </Button>
                </>
              ) : (
                <>
                  <p>Postuler est inclus dans votre catalogue Talent.</p>
                  <Button variant="outline" to="/app/profile/plan">
                    Voir les offres
                  </Button>
                </>
              )}
            </>
          )}
        </aside>
      </div>
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
