import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, OnboardingRoute, ProtectedRoute, RoleRoute } from "@/shared/components/RouteGuards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { HomePage } from "@/features/home/HomePage";
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
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminModulePage } from "@/components/admin/AdminModulePage";
import { AdminConfigHubPage, AdminConfigSectionPage } from "@/components/admin/AdminConfigPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ProfilePage } from "@/components/dashboard/ProfilePage";
import { CvPage } from "@/components/dashboard/CvPage";
import { CertificationsPage } from "@/components/dashboard/CertificationsPage";
import { VideosPage } from "@/components/dashboard/VideosPage";
import { AvailabilityPage } from "@/components/dashboard/AvailabilityPage";
import { OpportunitiesPage } from "@/components/dashboard/OpportunitiesPage";
import { ApplicationsPage } from "@/components/dashboard/ApplicationsPage";
import { SettingsPage } from "@/components/dashboard/SettingsPage";
import { isBusiness, isCandidate, isSuperAdmin } from "@/features/auth/types";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/fitness-hire-elite" element={<PublicModulePage content={HIRE_PAGE} />} />
        <Route path="/coaching" element={<PublicModulePage content={COACHING_PAGE} />} />
        <Route path="/services" element={<PublicModulePage content={SERVICES_PAGE} />} />
        <Route path="/marketplace" element={<PublicModulePage content={MARKETPLACE_PAGE} />} />
        <Route path="/academie" element={<PublicModulePage content={ACADEMY_PAGE} />} />
        <Route path="/news" element={<PublicModulePage content={NEWS_PAGE} />} />
        <Route path="/events" element={<PublicModulePage content={EVENTS_PAGE} />} />
        <Route path="/tarifs" element={<PricingPage />} />
      </Route>
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
        <Route path="/profile" element={<Navigate to="/app/profile/edit" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/profile/edit" element={<CompleteProfilePage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<RoleRoute allow={isCandidate} />}>
            <Route path="/app/cv" element={<CvPage />} />
            <Route path="/app/certifications" element={<CertificationsPage />} />
            <Route path="/app/videos" element={<VideosPage />} />
            <Route path="/app/availability" element={<AvailabilityPage />} />
            <Route path="/app/opportunities" element={<OpportunitiesPage />} />
            <Route path="/app/applications" element={<ApplicationsPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => isBusiness(user) || isSuperAdmin(user)} />}>
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/job-offers" element={<JobOffersPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => isCandidate(user) || isBusiness(user)} />}>
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
            <Route path="/app/contracts" element={<Navigate to="/contracts" replace />} />
          </Route>
          <Route element={<RoleRoute allow={isSuperAdmin} />}>
            <Route path="/admin" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/users" element={<Navigate to="/users" replace />} />
            <Route path="/admin/config" element={<AdminConfigHubPage />} />
            <Route path="/admin/config/:section" element={<AdminConfigSectionPage />} />
            <Route path="/admin/:module" element={<AdminModulePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
