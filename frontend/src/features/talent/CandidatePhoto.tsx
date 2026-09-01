import { useCallback } from "react";
import { fetchCandidateFile } from "@/features/talent/api";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

export function CandidatePhoto({
  candidateId,
  uploadId,
  name,
  size,
}: {
  candidateId: string;
  uploadId?: string | null;
  name: string;
  size?: number;
}) {
  const fetchBlob = useCallback((id: string) => fetchCandidateFile(candidateId, id), [candidateId]);
  return <ProfileAvatar uploadId={uploadId} name={name} size={size} fetchBlob={fetchBlob} />;
}
