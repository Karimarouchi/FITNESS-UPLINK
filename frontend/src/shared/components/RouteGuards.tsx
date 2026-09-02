import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor, type AuthUser } from "@/features/auth/types";

export function ProtectedRoute() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.onboardingStep !== "DONE") {
    return <Navigate to={destinationFor(user)} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (user) {
    return <Navigate to={destinationFor(user)} replace />;
  }
  return <Outlet />;
}

export function OnboardingRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.onboardingStep === "DONE") {
    return <Navigate to="/app/dashboard" replace />;
  }
  const path = location.pathname;
  if (path === "/onboarding/country" && user.onboardingStep === "ROLE") {
    return <Navigate to="/onboarding/role" replace />;
  }
  if (path === "/onboarding/profile" && user.onboardingStep === "ROLE") {
    return <Navigate to="/onboarding/role" replace />;
  }
  if (path === "/onboarding/profile" && user.onboardingStep === "COUNTRY") {
    return <Navigate to="/onboarding/country" replace />;
  }
  return <Outlet />;
}

export function RoleRoute({ allow }: { allow: (user: AuthUser) => boolean }) {
  const { user } = useAuth();
  if (!user || !allow(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
