import { useCallback } from "react";
import { fetchProviderFile } from "@/features/services/api";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

export function ProviderLogo({
  providerId,
  uploadId,
  name,
  size,
}: {
  providerId: string;
  uploadId?: string | null;
  name: string;
  size?: number;
}) {
  const fetchBlob = useCallback((id: string) => fetchProviderFile(providerId, id), [providerId]);
  return <ProfileAvatar uploadId={uploadId} name={name} size={size} fetchBlob={fetchBlob} />;
}
