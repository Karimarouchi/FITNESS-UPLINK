import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";

export function AcademyHomeRedirect() {
  const { user } = useAuth();
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) {
    return <Navigate to="/app/academy/formations" replace />;
  }
  return <Navigate to="/app/academy/registrations" replace />;
}
