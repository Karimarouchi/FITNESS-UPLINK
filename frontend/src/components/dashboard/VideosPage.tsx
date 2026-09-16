import { Button } from "@/components/ui/Button";
import { useOwnProfile } from "@/features/me/ownProfile";

export function VideosPage() {
  const { profile, error, loading } = useOwnProfile();
  const videos = profile?.videos ?? [];

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Vidéos de présentation</h1>
          <div className="sub">Liens vers vos vidéos (YouTube, Vimeo…)</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/app/profile/edit">
            Ajouter un lien
          </Button>
        </div>
      </div>
      {loading ? <p className="empty-hint">Chargement…</p> : null}
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="video-grid">
        {videos.map((url) => (
          <a key={url} className="video-card" href={url} target="_blank" rel="noreferrer">
            <div className="play">▶</div>
            <div className="cap">{url}</div>
          </a>
        ))}
        {!loading && videos.length === 0 ? <p className="empty-hint">Aucun lien vidéo n&apos;a été ajouté.</p> : null}
      </div>
    </section>
  );
}
