import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

type SearchBarProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function CatalogSearch({ value, placeholder, onChange, onSubmit }: SearchBarProps) {
  return (
    <form
      className="cat-search"
      role="search"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        search
      </span>
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          className="cat-search-clear"
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => {
            onChange("");
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      ) : null}
      <button className="cat-search-go" type="submit">
        Rechercher
      </button>
    </form>
  );
}

type ChipsProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel: string;
  onChange: (value: string) => void;
};

export function CatalogChips({ label, value, options, allLabel, onChange }: ChipsProps) {
  return (
    <div className="cat-chips" role="radiogroup" aria-label={label}>
      {[{ value: "", label: allLabel }, ...options].map((option) => (
        <button
          key={option.value || "all"}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "cat-chip is-on" : "cat-chip"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CatalogToolbar({ count, noun, onReset }: { count: number; noun: string; onReset?: () => void }) {
  return (
    <div className="cat-toolbar">
      <p>
        <strong>{count}</strong> {noun}
        {count > 1 ? "s" : ""}
      </p>
      {onReset ? (
        <button type="button" onClick={onReset}>
          <span className="material-symbols-outlined" aria-hidden="true">
            restart_alt
          </span>
          Réinitialiser les filtres
        </button>
      ) : null}
    </div>
  );
}

export function CatalogSkeleton({ count = 6, wide = false }: { count?: number; wide?: boolean }) {
  return (
    <div className={wide ? "cat-grid is-wide" : "cat-grid"} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="cat-card is-skeleton" key={index}>
          <div className="cat-media" />
          <div className="cat-body">
            <i />
            <i />
            <i />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CatalogEmpty({
  icon,
  title,
  text,
  action,
}: {
  icon: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="cat-empty">
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function GuestNudge({ text, redirect }: { text: string; redirect?: string }) {
  const login = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  return (
    <aside className="cat-nudge">
      <span className="cat-nudge-icon material-symbols-outlined" aria-hidden="true">
        lock_open
      </span>
      <div>
        <strong>Accès complet réservé aux membres</strong>
        <p>{text}</p>
      </div>
      <div className="cat-nudge-actions">
        <Link className="pub-btn pub-btn-lime" to="/signup">
          Créer mon compte
        </Link>
        <Link className="pub-btn pub-btn-line ink" to={login}>
          Se connecter
        </Link>
      </div>
    </aside>
  );
}

export function CatalogPager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav className="cat-pager" aria-label="Pagination">
      <button type="button" disabled={page <= 0} onClick={() => onChange(page - 1)} aria-label="Page précédente">
        <span className="material-symbols-outlined" aria-hidden="true">
          chevron_left
        </span>
      </button>
      {Array.from({ length: pageCount }, (_, index) => index)
        .filter((index) => index === 0 || index === pageCount - 1 || Math.abs(index - page) <= 1)
        .map((index, position, list) => (
          <span key={index} className="cat-pager-item">
            {position > 0 && index - list[position - 1] > 1 ? <em aria-hidden="true">…</em> : null}
            <button
              type="button"
              className={index === page ? "is-on" : undefined}
              aria-current={index === page ? "page" : undefined}
              onClick={() => onChange(index)}
            >
              {index + 1}
            </button>
          </span>
        ))}
      <button type="button" disabled={page + 1 >= pageCount} onClick={() => onChange(page + 1)} aria-label="Page suivante">
        <span className="material-symbols-outlined" aria-hidden="true">
          chevron_right
        </span>
      </button>
    </nav>
  );
}
