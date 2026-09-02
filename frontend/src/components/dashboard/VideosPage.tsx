import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { fetchUploadBlob } from "@/features/onboarding/api";
import { useOwnProfile } from "@/features/me/ownProfile";
import type { FileRef } from "@/features/talent/api";

export function VideosPage() {
  const { profile, error, loading } = useOwnProfile();
  const videos = profile?.videos ?? [];

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Vidéos de présentation</h1>
          <div className="sub">Fichiers transmis dans votre profil</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/app/profile/edit">
            Ajouter une vidéo
          </Button>
        </div>
      </div>
      {loading ? <p className="empty-hint">Chargement…</p> : null}
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={video.id} file={video} />
        ))}
        {!loading && videos.length === 0 ? <p className="empty-hint">Aucune vidéo de présentation n&apos;a été transmise.</p> : null}
      </div>
    </section>
  );
}

function VideoCard({ file }: { file: FileRef }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetchUploadBlob(file.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file.id]);

  return (
    <div className="video-card">
      {src ? <video src={src} controls preload="metadata" /> : <div className="play">▶</div>}
      <div className="cap">{file.name}</div>
    </div>
  );
}
