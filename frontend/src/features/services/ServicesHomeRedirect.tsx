import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";

export function ServicesHomeRedirect() {
  const { user } = useAuth();
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) {
    return <Navigate to="/app/services/mine" replace />;
  }
  return <Navigate to="/services/providers" replace />;
}
