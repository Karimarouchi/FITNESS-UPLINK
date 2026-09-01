import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { GuestRoute, OnboardingRoute, ProtectedRoute } from "@/shared/components/RouteGuards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { HomePage } from "@/features/home/HomePage";
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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
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
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/job-offers" element={<JobOffersPage />} />
          <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
