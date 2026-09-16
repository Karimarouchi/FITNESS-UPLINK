import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { CONTENT_TYPE_LABELS, fetchFormations, formationImageUrl, type FormationCard } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

export function AcademyLandingPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [contentType, setContentType] = useState(params.get("contentType") ?? "");
  const [page, setPage] = useState(Number(params.get("page") ?? "0") || 0);
  const [items, setItems] = useState<FormationCard[]>([]);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => ({ q: query, contentType, page }), [query, contentType, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetchFormations(filters)
        .then((result) => {
          if (cancelled) return;
          setItems(result.items);
          setTotal(result.total);
          setSize(result.size);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Impossible de charger les formations.");
            setItems([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [filters]);

  function applyParams(next: Record<string, string>) {
    const search = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    setParams(search, { replace: true });
  }

  const pageCount = Math.max(1, Math.ceil(total / size));

  return (
    <section style={{ padding: "48px" }}>
      <div className="page-head">
        <div>
          <h1>Académie &amp; formations</h1>
          <p className="sub">Formations, certifications, workshops, webinars et masterclass proposés par nos organismes partenaires.</p>
        </div>
      </div>

      <form
        className="hire-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          applyParams({ q: query, contentType });
        }}
      >
        <input placeholder="Titre, formateur…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="">Tous types</option>
          {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <Button variant="solid" type="submit">
          Rechercher
        </Button>
      </form>

      {error ? <p className="auth-error mt-6">{error}</p> : null}

      {!loading && items.length === 0 && !error ? (
        <p className="jobs-empty">
          <strong>Aucune formation trouvée</strong>
          <span>Essayez d'élargir vos filtres.</span>
        </p>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <p className="muted-line">
            {total} formation{total > 1 ? "s" : ""}
          </p>
          <motion.div
            className="fu-talent-grid"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {items.map((item) => (
              <motion.article
                key={item.id}
                className="fu-talent-card"
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                {item.imageUploadId ? (
                  <img
                    src={formationImageUrl(item.id, item.imageUploadId)}
                    alt={item.title}
                    style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", marginBottom: 10 }}
                  />
                ) : null}
                <div className="pn">{item.title}</div>
                {item.trainerName ? <div className="pt">{item.trainerName}</div> : null}
                <div className="ploc">{item.organizer?.name ?? "Organisme"}</div>
                <div className="tag-row">
                  <Tag>{CONTENT_TYPE_LABELS[item.contentType]}</Tag>
                  {item.hasCertification ? <Tag>Certification</Tag> : null}
                  {item.online ? <Tag>En ligne</Tag> : null}
                </div>
                {item.nextSessionAt ? (
                  <p className="fu-talent-meta">
                    Prochaine session : {new Date(item.nextSessionAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                    {item.nextSessionSeatsLeft !== null ? ` · ${item.nextSessionSeatsLeft} places restantes` : ""}
                  </p>
                ) : (
                  <p className="fu-talent-meta">Aucune session programmée</p>
                )}
                <p className="fu-talent-meta">
                  {Number(item.priceAmount) > 0 ? `${item.priceAmount} ${item.priceCurrency}` : "Gratuit"}
                </p>
                <div className="fu-talent-card-actions">
                  <Button variant="mini" to={`/academie/formations/${item.id}`}>
                    Voir la formation
                  </Button>
                </div>
              </motion.article>
            ))}
          </motion.div>
          {pageCount > 1 ? (
            <div className="hire-pager">
              <Button variant="outline" type="button" disabled={page <= 0} onClick={() => setPage((c) => Math.max(0, c - 1))}>
                Précédent
              </Button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <Button variant="outline" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((c) => c + 1)}>
                Suivant
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
