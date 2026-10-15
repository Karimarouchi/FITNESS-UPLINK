import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CONTRACT_TYPES, type Opportunity } from "./api";

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

export function OpportunityCard({ item, index = 0 }: { item: Opportunity; index?: number }) {
  const salary = item.salaryAmount ? `${item.salaryAmount} ${item.salaryCurrency ?? ""}`.trim() : null;
  const contract = item.contractType ? contractLabel(item.contractType) : null;
  const country = item.employerCountry ? `${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : null;
  return (
    <Link
      className={item.applied ? "oppx-card is-applied" : "oppx-card"}
      to={`/app/opportunities/${item.id}`}
      style={{ "--i": index } as CSSProperties}
    >
      <div className="oppx-top">
        <span className="oppx-mark" aria-hidden="true">
          {initials(item.employerName || item.title)}
        </span>
        {item.applied ? (
          <span className="oppx-badge">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            Candidature envoyée
          </span>
        ) : contract ? (
          <span className="oppx-badge is-contract">{contract}</span>
        ) : null}
      </div>

      <h3 className="oppx-title">{item.title}</h3>
      <p className="oppx-employer">{item.employerName}</p>

      <ul className="oppx-facts">
        {item.location ? (
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">
              location_on
            </span>
            {item.location}
          </li>
        ) : null}
        {country ? (
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">
              public
            </span>
            {country}
          </li>
        ) : null}
        {item.applied && contract ? (
          <li>
            <span className="material-symbols-outlined" aria-hidden="true">
              description
            </span>
            {contract}
          </li>
        ) : null}
      </ul>

      <div className="oppx-foot">
        <b className="oppx-salary">{salary ?? "Salaire non précisé"}</b>
        <span className="oppx-go">
          {item.applied ? "Voir" : "Postuler"}
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_forward
          </span>
        </span>
      </div>
    </Link>
  );
}
