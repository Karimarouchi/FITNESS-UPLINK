import type { JobOffer } from "@/features/jobs/api";
import { PIPELINE_STATUSES, type PipelineStatus } from "./api";

export function PipelineFilters({
  offers,
  offerFilter,
  statusFilter,
  query,
  onOfferFilter,
  onStatusFilter,
  onQuery,
}: {
  offers: JobOffer[];
  offerFilter: string;
  statusFilter: string;
  query: string;
  onOfferFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="pipeline-filters">
      <select className="custom-input" value={offerFilter} onChange={(event) => onOfferFilter(event.target.value)}>
        <option value="">Toutes les offres</option>
        <option value="direct">Recrutement direct</option>
        {offers.map((offer) => (
          <option key={offer.id} value={offer.id}>
            {offer.title}
          </option>
        ))}
      </select>
      <select className="custom-input" value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)}>
        <option value="">Tous les statuts</option>
        {PIPELINE_STATUSES.filter((status) => status.value !== "APPLIED").map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <input
        className="custom-input"
        value={query}
        placeholder="Rechercher un candidat..."
        onChange={(event) => onQuery(event.target.value)}
      />
    </div>
  );
}

export type OfferFilter = { jobOfferId?: string; direct?: boolean };

export function parseOfferFilter(value: string): OfferFilter {
  if (value === "direct") {
    return { direct: true };
  }
  if (value) {
    return { jobOfferId: value };
  }
  return {};
}

export function isExitStatus(status: PipelineStatus) {
  return status === "REJECTED" || status === "ARCHIVED";
}
