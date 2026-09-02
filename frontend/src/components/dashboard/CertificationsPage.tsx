import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatBytes, useOwnProfile } from "@/features/me/ownProfile";
import { fetchUploadBlob } from "@/features/onboarding/api";
import type { FileRef } from "@/features/talent/api";
import { useAuth } from "@/features/auth/AuthContext";
import { isVerified } from "@/features/auth/types";

export function CertificationsPage() {
  const { user } = useAuth();
  const { profile, error, loading } = useOwnProfile();
  const docs = [
    ...(profile?.diplomas ?? []).map((file) => ({ file, kind: "Diplôme" })),
    ...(profile?.certifications ?? []).map((file) => ({ file, kind: "Certification" })),
  ];

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Diplômes & certifications</h1>
          <div className="sub">Documents transmis lors de la création de votre profil</div>
        </div>
        <div className="head-actions">
          <Button variant="primary" to="/app/profile/edit">
            Ajouter un document
          </Button>
        </div>
      </div>
      {loading ? <p className="empty-hint">Chargement…</p> : null}
      {error ? <p className="empty-hint">{error}</p> : null}
      <div className="doc-grid">
        {docs.map(({ file, kind }) => (
          <DocCard key={file.id} file={file} kind={kind} verified={isVerified(user)} />
        ))}
        {!loading && docs.length === 0 ? <p className="empty-hint">Aucun diplôme ni certification transmis.</p> : null}
      </div>
    </section>
  );
}

function DocCard({ file, kind, verified }: { file: FileRef; kind: string; verified: boolean }) {
  async function open() {
    const blob = await fetchUploadBlob(file.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
  }

  return (
    <button className="doc-card" type="button" onClick={() => void open()}>
      <div className="top">
        <div className="doc-icon">🎓</div>
        <StatusPill tone={verified ? "verified" : "pending"}>{verified ? "Vérifié" : "En revue"}</StatusPill>
      </div>
      <div className="t">{file.name}</div>
      <div className="org">{kind}</div>
      <div className="meta">{formatBytes(file.size)}</div>
    </button>
  );
}
