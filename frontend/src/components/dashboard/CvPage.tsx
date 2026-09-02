import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchUploadBlob } from "@/features/onboarding/api";
import { formatBytes, useOwnProfile } from "@/features/me/ownProfile";

export function CvPage() {
  const { profile, error, loading } = useOwnProfile();
  const cv = profile?.cv;

  async function download() {
    if (!cv) {
      return;
    }
    const blob = await fetchUploadBlob(cv.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = cv.name || "cv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>CV</h1>
          <div className="sub">Document utilisé par les employeurs lors de l&apos;étude de votre candidature</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/app/profile/edit">
            Mettre à jour
          </Button>
        </div>
      </div>

      <Panel title="Fichier actuel">
        {loading ? <p className="empty-hint">Chargement…</p> : null}
        {error ? <p className="empty-hint">{error}</p> : null}
        {!loading && !cv ? <p className="empty-hint">Aucun CV n&apos;a encore été transmis.</p> : null}
        {cv ? (
          <div className="exp-item centered">
            <div className="doc-icon">📄</div>
            <div className="exp-body grow">
              <div className="t">{cv.name}</div>
              <div className="c">{formatBytes(cv.size)}</div>
            </div>
            <Button variant="mini" onClick={() => void download()}>
              Télécharger
            </Button>
          </div>
        ) : null}
      </Panel>
    </section>
  );
}
