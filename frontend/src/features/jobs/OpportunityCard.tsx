import { Link } from "react-router-dom";
import { ArrowRight, FileText, Globe, MapPin } from "lucide-react";
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

export function OpportunityCard({ item }: { item: Opportunity; index?: number }) {
  const salary = item.salaryAmount ? `${item.salaryAmount} ${item.salaryCurrency ?? ""}`.trim() : null;
  const contract = item.contractType ? contractLabel(item.contractType) : null;
  const country = item.employerCountry ? `${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : null;
  return (
    <Link className={item.applied ? "hr-card is-applied" : "hr-card"} to={`/app/opportunities/${item.id}`}>
      <div className="hr-card-top">
        <span className="hr-mark" aria-hidden="true">
          {initials(item.employerName || item.title)}
        </span>
        {item.applied ? (
          <span className="bo-users-status is-success">Candidature envoyée</span>
        ) : contract ? (
          <span className="bo-users-role is-blue">{contract}</span>
        ) : null}
      </div>

      <h3 className="hr-title">{item.title}</h3>
      <p className="hr-employer">{item.employerName}</p>

      <ul className="hr-facts">
        {item.location ? (
          <li>
            <MapPin size={15} aria-hidden="true" />
            {item.location}
          </li>
        ) : null}
        {country ? (
          <li>
            <Globe size={15} aria-hidden="true" />
            {country}
          </li>
        ) : null}
        {item.applied && contract ? (
          <li>
            <FileText size={15} aria-hidden="true" />
            {contract}
          </li>
        ) : null}
      </ul>

      <div className="hr-foot">
        <b className={salary ? "hr-salary" : "hr-salary is-muted"}>{salary ?? "Salaire non précisé"}</b>
        <span className="hr-go">
          {item.applied ? "Voir" : "Postuler"}
          <ArrowRight size={15} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
