import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor, safeRedirectTarget, type AuthUser } from "@/features/auth/types";

export function ProtectedRoute() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (user.onboardingStep !== "DONE") {
    return <Navigate to={destinationFor(user)} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (user) {
    const redirect = safeRedirectTarget(new URLSearchParams(location.search).get("redirect"));
    return <Navigate to={redirect ?? destinationFor(user)} replace />;
  }
  return <Outlet />;
}

export function MemberOnlyRoute() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
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
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (user.onboardingStep === "DONE") {
    return <Navigate to="/app/dashboard" replace />;
  }
  const path = location.pathname;
  if (user.onboardingStep === "PLAN" && path !== "/onboarding/plans" && path !== "/onboarding/profile" && path !== "/onboarding/payment") {
    return <Navigate to="/onboarding/plans" replace />;
  }
  if (user.onboardingStep === "PAYMENT" && path !== "/onboarding/payment" && path !== "/onboarding/plans") {
    return <Navigate to="/onboarding/payment" replace />;
  }
  if (path === "/onboarding/plans" && user.onboardingStep !== "PLAN" && user.onboardingStep !== "PAYMENT") {
    return <Navigate to={destinationFor(user)} replace />;
  }
  if (path === "/onboarding/payment" && user.onboardingStep !== "PAYMENT" && user.onboardingStep !== "PLAN") {
    return <Navigate to={destinationFor(user)} replace />;
  }
  if ((path === "/onboarding/country" || path === "/onboarding/profile" || path === "/onboarding/intent" || path === "/onboarding/plans" || path === "/onboarding/payment") && user.onboardingStep === "ROLE") {
    return <Navigate to="/onboarding/role" replace />;
  }
  if ((path === "/onboarding/country" || path === "/onboarding/profile") && user.onboardingStep === "INTENT") {
    return <Navigate to="/onboarding/intent" replace />;
  }
  if (path === "/onboarding/intent" && user.onboardingStep === "COUNTRY") {
    return <Navigate to="/onboarding/country" replace />;
  }
  if (path === "/onboarding/profile" && user.onboardingStep === "COUNTRY") {
    return <Navigate to="/onboarding/country" replace />;
  }
  return <Outlet />;
}

export function VerifyEmailRoute() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.emailVerified) {
    return <Navigate to={destinationFor(user)} replace />;
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
