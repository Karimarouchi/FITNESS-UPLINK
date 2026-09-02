import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { GuestRoute, OnboardingRoute, ProtectedRoute } from "@/shared/components/RouteGuards";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor } from "@/features/auth/types";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { DashboardPage } from "@/features/home/DashboardPage";
import { HomePage } from "@/features/home/HomePage";
import { PublicLayout } from "@/features/home/components/PublicLayout";
import { PublicModulePage } from "@/features/home/pages/PublicModulePage";
import { PricingPage } from "@/features/home/pages/PricingPage";
import {
  ACADEMY_PAGE,
  COACHING_PAGE,
  EVENTS_PAGE,
  HIRE_PAGE,
  MARKETPLACE_PAGE,
  NEWS_PAGE,
  SERVICES_PAGE,
} from "@/features/home/data";
import { UsersPage } from "@/features/users/UsersPage";
import { ChooseRolePage } from "@/features/onboarding/pages/ChooseRolePage";
import { ChooseCountryPage } from "@/features/onboarding/pages/ChooseCountryPage";
import { CompleteProfilePage } from "@/features/onboarding/pages/CompleteProfilePage";
import { CandidatesPage } from "@/features/talent/pages/CandidatesPage";
import { CandidateDetailPage } from "@/features/talent/pages/CandidateDetailPage";
import { AdminVerificationsPage } from "@/features/admin/pages/AdminVerificationsPage";
import { PipelinePage } from "@/features/recruitment/pages/PipelinePage";
import { FavoritesPage } from "@/features/recruitment/pages/FavoritesPage";
import { JobOffersPage } from "@/features/jobs/pages/JobOffersPage";
import { ContractsPage } from "@/features/contracts/pages/ContractsPage";
import { ContractDetailPage } from "@/features/contracts/pages/ContractDetailPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";

function RootPage() {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="min-h-screen bg-surface-container-lowest" />;
  }
  if (!user) {
    return <HomePage />;
  }
  if (user.onboardingStep !== "DONE") {
    return <Navigate to={destinationFor(user)} replace />;
  }
  return (
    <Layout>
      <DashboardPage />
    </Layout>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootPage />} />
      <Route element={<GuestRoute />}>
        <Route element={<PublicLayout />}>
          <Route path="/fitness-hire-elite" element={<PublicModulePage content={HIRE_PAGE} />} />
          <Route path="/coaching" element={<PublicModulePage content={COACHING_PAGE} />} />
          <Route path="/services" element={<PublicModulePage content={SERVICES_PAGE} />} />
          <Route path="/marketplace" element={<PublicModulePage content={MARKETPLACE_PAGE} />} />
          <Route path="/academie" element={<PublicModulePage content={ACADEMY_PAGE} />} />
          <Route path="/news" element={<PublicModulePage content={NEWS_PAGE} />} />
          <Route path="/events" element={<PublicModulePage content={EVENTS_PAGE} />} />
          <Route path="/tarifs" element={<PricingPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding/role" element={<ChooseRolePage />} />
        <Route path="/onboarding/country" element={<ChooseCountryPage />} />
        <Route path="/onboarding/profile" element={<CompleteProfilePage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<CompleteProfilePage />} />
        <Route element={<Layout />}>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/job-offers" element={<JobOffersPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
