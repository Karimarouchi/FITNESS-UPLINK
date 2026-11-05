import { ChevronLeft, ChevronRight } from "lucide-react";
import { DashSelect } from "@/components/admin/dash/DashSelect";

const SIZES = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

function pageList(current: number, count: number): (number | null)[] {
  if (count <= 7) {
    return Array.from({ length: count }, (_, index) => index);
  }
  const keep = new Set([0, count - 1, current - 1, current, current + 1].filter((value) => value >= 0 && value < count));
  const sorted = [...keep].sort((left, right) => left - right);
  const out: (number | null)[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) {
      out.push(null);
    }
    out.push(value);
  });
  return out;
}

/** Pagination footer shared by the admin module tables (same markup as the Users page). `page` is zero-based. */
export function ModulePager({
  total,
  page,
  size,
  noun,
  onPage,
  onSize,
}: {
  total: number;
  page: number;
  size: number;
  noun: string;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const count = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);

  return (
    <footer className="bo-users-pager">
      <span>
        {total === 0 ? `Aucun ${noun}` : `Affichage de ${from} à ${to} sur ${total} ${noun}${total > 1 ? "s" : ""}`}
      </span>
      <nav className="bo-users-pages" aria-label="Pagination">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Page précédente">
          <ChevronLeft size={16} />
        </button>
        {pageList(page, count).map((value, index) =>
          value === null ? (
            <span key={`gap-${index}`} className="bo-users-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              className={value === page ? "is-current" : undefined}
              aria-current={value === page ? "page" : undefined}
              aria-label={`Page ${value + 1}`}
              onClick={() => onPage(value)}
            >
              {value + 1}
            </button>
          ),
        )}
        <button type="button" disabled={page >= count - 1} onClick={() => onPage(page + 1)} aria-label="Page suivante">
          <ChevronRight size={16} />
        </button>
      </nav>
      <DashSelect
        label="Lignes par page"
        value={String(size)}
        options={SIZES}
        onChange={(value) => onSize(Number(value))}
        placement="up"
      />
    </footer>
  );
}
