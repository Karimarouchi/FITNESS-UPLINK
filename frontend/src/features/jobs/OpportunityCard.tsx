import { Link } from "react-router-dom";
import { Tag } from "@/components/ui/Tag";
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

export function OpportunityCard({ item }: { item: Opportunity }) {
  const salary = item.salaryAmount ? `${item.salaryAmount} ${item.salaryCurrency ?? ""}`.trim() : null;
  return (
    <Link className="hire-card" to={`/app/opportunities/${item.id}`}>
      <div className="hire-card-mark" aria-hidden="true">
        {initials(item.employerName || item.title)}
      </div>
      <div className="hire-card-copy">
        <strong>{item.title}</strong>
        <p>
          {item.employerName}
          {item.location ? ` · ${item.location}` : ""}
          {item.employerCountry ? ` · ${item.employerCountry.flagEmoji} ${item.employerCountry.name}` : ""}
        </p>
        <div className="tag-row">
          {item.contractType ? <Tag>{contractLabel(item.contractType)}</Tag> : null}
          {salary ? <Tag>{salary}</Tag> : null}
          {item.applied ? <Tag>Candidature envoyée</Tag> : null}
        </div>
      </div>
      <span className="hire-card-go">{item.applied ? "Voir" : "Postuler"}</span>
    </Link>
  );
}
