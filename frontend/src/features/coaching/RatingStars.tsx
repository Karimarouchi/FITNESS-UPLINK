import { useState } from "react";

type Props = {
  value: number;
  count: number;
  canReview?: boolean;
  myRating?: number | null;
  onSubmit?: (rating: number, comment?: string) => Promise<void>;
};

export function RatingStars({ value, count, canReview = false, myRating = null, onSubmit }: Props) {
  const [picked, setPicked] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = hover || picked || myRating || Math.round(value);
  const interactive = canReview && Boolean(onSubmit) && myRating == null;

  async function publish(rating: number, text?: string) {
    if (!onSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(rating, text);
      setPicked(0);
      setComment("");
    } catch {
      setError("Impossible d’enregistrer la note.");
    } finally {
      setSaving(false);
    }
  }

  function choose(n: number) {
    if (!interactive || saving) return;
    setPicked(n);
    if (n >= 4) {
      void publish(n);
    }
  }

  return (
    <div className="rating-stars-wrap">
      <span className={`rating-stars${interactive ? " is-interactive" : ""}`} aria-label={`Note ${value.toFixed(1)} sur 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="rating-star-btn"
            disabled={!interactive || saving}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onMouseEnter={() => interactive && setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => choose(n)}
            style={{ color: n <= display ? "#f59e0b" : "#d1d5db" }}
          >
            {n <= display ? "★" : "☆"}
          </button>
        ))}
        {myRating != null ? (
          <span className="rating-value">Votre note : {myRating}/5</span>
        ) : count > 0 ? (
          <>
            <span className="rating-value">{value.toFixed(1)}</span>
            <span className="rating-count">({count})</span>
          </>
        ) : (
          <span className="rating-value">{interactive ? "Noter ce coach" : "Nouveau"}</span>
        )}
      </span>
      {interactive && picked > 0 && picked <= 3 ? (
        <div className="rating-comment">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Expliquez ce qui n’a pas fonctionné (optionnel)"
            rows={3}
          />
          <button type="button" className="rating-publish" disabled={saving} onClick={() => void publish(picked, comment || undefined)}>
            {saving ? "Envoi…" : "Publier la note"}
          </button>
        </div>
      ) : null}
      {error ? <p className="auth-error" style={{ marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
