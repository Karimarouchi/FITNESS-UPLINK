import { useEffect, useState } from "react";
import { fetchUploadBlob } from "@/features/onboarding/api";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function ProfileAvatar({
  uploadId,
  name,
  size = 40,
  fetchBlob = fetchUploadBlob,
}: {
  uploadId?: string | null;
  name: string;
  size?: number;
  fetchBlob?: (id: string) => Promise<Blob>;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!uploadId) {
      setSrc(null);
      return;
    }
    fetchBlob(uploadId)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [uploadId, fetchBlob]);

  return (
    <span
      className="app-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.36)),
        backgroundImage: src ? `url(${src})` : undefined,
      }}
      aria-hidden="true"
    >
      {src ? null : initialsOf(name)}
    </span>
  );
}
