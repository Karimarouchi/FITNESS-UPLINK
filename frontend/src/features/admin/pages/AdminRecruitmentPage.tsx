import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, UserRound, UsersRound } from "lucide-react";
import { ModulePager } from "@/components/admin/ModulePager";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { fetchCandidateFile, fetchCandidates, type CandidateCard } from "@/features/talent/api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

/** Candidate photos are served by the candidate-files endpoint; when it refuses, ProfileAvatar falls back to initials. */
function CandidateAvatar({ item }: { item: CandidateCard }) {
  const fetchBlob = useCallback((uploadId: string) => fetchCandidateFile(item.id, uploadId), [item.id]);
  return <ProfileAvatar uploadId={item.photoUploadId} name={item.displayName} size={40} fetchBlob={fetchBlob} />;
}

export function AdminRecruitmentPage() {
  const [items, setItems] = useState<CandidateCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // the search box feeds the existing `q` parameter of GET /v1/candidates, after a short pause
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(query.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCandidates({ q: term, page, size })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Impossible de charger les candidats.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term, page, size]);

  return (
    <section className="bo-dash bo-users bo-bm bo-rc">
      <header className="bo-dash-head">
        <div>
          <h1>Recrutement</h1>
          <p>Découvrez les talents visibles sur Fitness-Hire Elite.</p>
        </div>
        <Link to="/candidates" className="bm-btn">
          <Search size={16} aria-hidden="true" />
          Recherche de talents
        </Link>
      </header>

      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        <div className="bo-users-toolbar">
          <div className="bm-card-title">
            <span className="bo-dash-icon is-blue" aria-hidden="true">
              <UsersRound size={22} />
            </span>
            <div>
              <h2>Candidats visibles</h2>
              <p>{loading && total === 0 ? "Chargement…" : `${total} profil${total > 1 ? "s" : ""} vérifié${total > 1 ? "s" : ""}`}</p>
            </div>
          </div>
          <label className="bo-users-search bm-toolbar-end">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un candidat…"
              aria-label="Rechercher un candidat"
            />
          </label>
        </div>

        <div className="bm-table-wrap">
          <table className="bm-table">
            <caption className="bm-sr">Candidats visibles</caption>
            <thead>
              <tr>
                <th scope="col">Candidat</th>
                <th scope="col">Titre</th>
                <th scope="col">Pays</th>
                <th scope="col">Statut</th>
                <th scope="col" className="is-actions">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0
                ? [0, 1, 2, 3, 4].map((key) => (
                    <tr key={key} className="is-skeleton" aria-hidden="true">
                      <td colSpan={5}>
                        <div className="bo-skeleton bm-skel" />
                      </td>
                    </tr>
                  ))
                : items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="bo-users-person">
                          <CandidateAvatar item={item} />
                          <div>
                            <strong>{item.displayName}</strong>
                            <small>{item.city ?? "—"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.title || <span className="bo-users-muted">—</span>}</td>
                      <td>
                        {item.country ? (
                          <div className="bo-users-country">
                            <span aria-hidden="true">{item.country.flagEmoji}</span>
                            <div>
                              <strong>{item.country.name}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="bo-users-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`bo-users-status ${item.verified ? "is-success" : "is-warn"}`}>
                          {item.verified ? "Vérifié" : "Non vérifié"}
                        </span>
                      </td>
                      <td className="is-actions">
                        <Link to={`/candidates/${item.id}`} className="bm-link" aria-label={`Voir le profil de ${item.displayName}`}>
                          Voir profil
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && !error && items.length === 0 ? (
            <div className="bo-users-empty">
              <span>
                <UserRound size={22} aria-hidden="true" />
              </span>
              <strong>{term ? "Aucun résultat" : "Aucun candidat visible"}</strong>
              <p>
                {term
                  ? "Aucun candidat ne correspond à cette recherche."
                  : "Les candidats vérifiés et visibles apparaîtront ici."}
              </p>
            </div>
          ) : null}
        </div>

        <ModulePager total={total} page={page} size={size} noun="candidat" onPage={setPage} onSize={(next) => {
          setSize(next);
          setPage(0);
        }} />
      </div>
    </section>
  );
}
