import { useCallback } from "react";
import { fetchCoachPhoto } from "@/features/coaching/api";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

export function CoachPhoto({
  coachId,
  uploadId,
  name,
  size,
}: {
  coachId: string;
  uploadId?: string | null;
  name: string;
  size?: number;
}) {
  const fetchBlob = useCallback((id: string) => fetchCoachPhoto(coachId, id), [coachId]);
  return <ProfileAvatar uploadId={uploadId} name={name} size={size} fetchBlob={fetchBlob} />;
}
