import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";

export function CoachingHomeRedirect() {
  const { user } = useAuth();
  if (hasPermission(user, PERMS.COACHING_MANAGE)) {
    return <Navigate to="/app/coaching/agenda" replace />;
  }
  return <Navigate to="/coaches" replace />;
}
