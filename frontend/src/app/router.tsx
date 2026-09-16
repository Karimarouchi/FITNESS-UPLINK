import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, OnboardingRoute, ProtectedRoute, RoleRoute, VerifyEmailRoute } from "@/shared/components/RouteGuards";
import { AuthSwitch } from "@/components/ui/auth-switch";
import { VerifyEmailPage } from "@/features/auth/pages/VerifyEmailPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { HomePage } from "@/features/home/HomePage";
import { PublicModulePage } from "@/features/home/pages/PublicModulePage";
import { PricingPage } from "@/features/home/pages/PricingPage";
import { EVENTS_PAGE, HIRE_PAGE, NEWS_PAGE, SERVICES_PAGE } from "@/features/home/data";
import { UsersPage } from "@/features/users/UsersPage";
import { ChooseRolePage } from "@/features/onboarding/pages/ChooseRolePage";
import { ChooseIntentPage } from "@/features/onboarding/pages/ChooseIntentPage";
import { ChooseCountryPage } from "@/features/onboarding/pages/ChooseCountryPage";
import { ChoosePlanPage } from "@/features/onboarding/pages/ChoosePlanPage";
import { PayOnboardingPage } from "@/features/onboarding/pages/PayOnboardingPage";
import { CompleteProfilePage } from "@/features/onboarding/pages/CompleteProfilePage";
import { CandidatesPage } from "@/features/talent/pages/CandidatesPage";
import { CandidateDetailPage } from "@/features/talent/pages/CandidateDetailPage";
import { AdminVerificationsPage } from "@/features/admin/pages/AdminVerificationsPage";
import { InboxPage } from "@/features/recruitment/pages/InboxPage";
import { FavoritesPage } from "@/features/recruitment/pages/FavoritesPage";
import { JobOffersPage } from "@/features/jobs/pages/JobOffersPage";
import { OpportunityDetailPage } from "@/features/jobs/pages/OpportunityDetailPage";
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
import { ModuleWorkspacePage } from "@/features/workspace/ModuleWorkspacePage";
import { BillingPage } from "@/features/billing/BillingPage";
import { CoachSearchPage } from "@/features/coaching/pages/CoachSearchPage";
import { CoachProfilePage } from "@/features/coaching/pages/CoachProfilePage";
import { CoachServicesPage } from "@/features/coaching/pages/CoachServicesPage";
import { CoachAgendaPage } from "@/features/coaching/pages/CoachAgendaPage";
import { CoachingPacksPage } from "@/features/coaching/pages/CoachingPacksPage";
import { MyBookingsPage } from "@/features/coaching/pages/MyBookingsPage";
import { PayBookingPage } from "@/features/coaching/pages/PayBookingPage";
import { CoachingHomeRedirect } from "@/features/coaching/CoachingHomeRedirect";
import { CoachingLandingPage } from "@/features/coaching/pages/CoachingLandingPage";
import { ProviderSearchPage } from "@/features/services/pages/ProviderSearchPage";
import { ProviderProfilePage } from "@/features/services/pages/ProviderProfilePage";
import { MyServicesPage } from "@/features/services/pages/MyServicesPage";
import { MyQuoteRequestsPage } from "@/features/services/pages/MyQuoteRequestsPage";
import { ServicesHomeRedirect } from "@/features/services/ServicesHomeRedirect";
import { ProductCatalogPage } from "@/features/marketplace/pages/ProductCatalogPage";
import { ProductDetailPage } from "@/features/marketplace/pages/ProductDetailPage";
import { QuoteConfirmPage } from "@/features/marketplace/pages/QuoteConfirmPage";
import { MyProductsPage } from "@/features/marketplace/pages/MyProductsPage";
import { MarketplaceRequestsPage } from "@/features/marketplace/pages/MarketplaceRequestsPage";
import { AcademyLandingPage } from "@/features/academy/pages/AcademyLandingPage";
import { FormationDetailPage } from "@/features/academy/pages/FormationDetailPage";
import { MyFormationsPage } from "@/features/academy/pages/MyFormationsPage";
import { MyRegistrationsPage } from "@/features/academy/pages/MyRegistrationsPage";
import { PayRegistrationPage } from "@/features/academy/pages/PayRegistrationPage";
import { AcademyHomeRedirect } from "@/features/academy/AcademyHomeRedirect";
import { hasPermission, isSuperAdmin } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/fitness-hire-elite" element={<PublicModulePage content={HIRE_PAGE} />} />
        <Route path="/coaching" element={<CoachingLandingPage />} />
        <Route path="/services" element={<PublicModulePage content={SERVICES_PAGE} />} />
        <Route path="/marketplace" element={<ProductCatalogPage />} />
        <Route path="/marketplace/products" element={<ProductCatalogPage />} />
        <Route path="/marketplace/products/:id" element={<ProductDetailPage />} />
        <Route path="/marketplace/quote/confirm" element={<QuoteConfirmPage />} />
        <Route path="/academie" element={<AcademyLandingPage />} />
        <Route path="/academie/formations/:id" element={<FormationDetailPage />} />
        <Route path="/news" element={<PublicModulePage content={NEWS_PAGE} />} />
        <Route path="/events" element={<PublicModulePage content={EVENTS_PAGE} />} />
        <Route path="/tarifs" element={<PricingPage />} />
      </Route>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<AuthSwitch />} />
        <Route path="/signup" element={<AuthSwitch />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<VerifyEmailRoute />}>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding/role" element={<ChooseRolePage />} />
        <Route path="/onboarding/intent" element={<ChooseIntentPage />} />
        <Route path="/onboarding/country" element={<ChooseCountryPage />} />
        <Route path="/onboarding/profile" element={<CompleteProfilePage />} />
        <Route path="/onboarding/plans" element={<ChoosePlanPage />} />
        <Route path="/onboarding/payment" element={<PayOnboardingPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Navigate to="/app/profile/edit" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<DashboardPage />} />
          <Route path="/app/profile" element={<ProfilePage />} />
          <Route path="/app/profile/edit" element={<CompleteProfilePage />} />
          <Route path="/app/profile/plan" element={<ChoosePlanPage account />} />
          <Route path="/app/profile/payment" element={<PayOnboardingPage account />} />
          <Route path="/app/billing" element={<BillingPage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_PROFILE)} />}>
            <Route path="/app/cv" element={<CvPage />} />
            <Route path="/app/certifications" element={<CertificationsPage />} />
            <Route path="/app/videos" element={<VideosPage />} />
            <Route path="/app/availability" element={<AvailabilityPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_APPLY)} />}>
            <Route path="/app/opportunities" element={<OpportunitiesPage />} />
            <Route path="/app/opportunities/:id" element={<OpportunityDetailPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_APPLICATIONS)} />}>
            <Route path="/app/applications" element={<ApplicationsPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_SEARCH)} />}>
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_FAVORITES)} />}>
            <Route path="/favorites" element={<FavoritesPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_PIPELINE)} />}>
            <Route path="/pipeline" element={<Navigate to="/applications" replace />} />
            <Route path="/applications" element={<InboxPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.HIRE_JOBS)} />}>
            <Route path="/job-offers" element={<JobOffersPage />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) =>
                  hasPermission(user, PERMS.HIRE_CONTRACTS_CANDIDATE) || hasPermission(user, PERMS.HIRE_CONTRACTS_EMPLOYER)
                }
              />
            }
          >
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
            <Route path="/app/contracts" element={<Navigate to="/contracts" replace />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.COACHING_MANAGE) || hasPermission(user, PERMS.COACHING_DISCOVER)}
              />
            }
          >
            <Route path="/app/coaching" element={<CoachingHomeRedirect />} />
            <Route path="/app/coaching/packs" element={<CoachingPacksPage />} />
            <Route path="/coaches/:id" element={<CoachProfilePage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.COACHING_DISCOVER)} />}>
            <Route path="/coaches" element={<CoachSearchPage />} />
            <Route path="/app/coaching/bookings" element={<MyBookingsPage />} />
            <Route path="/app/coaching/bookings/:id/pay" element={<PayBookingPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.COACHING_MANAGE)} />}>
            <Route path="/app/coaching/services" element={<CoachServicesPage />} />
            <Route path="/app/coaching/agenda" element={<CoachAgendaPage />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.ACADEMY_MANAGE) || hasPermission(user, PERMS.ACADEMY_BROWSE)}
              />
            }
          >
            <Route path="/app/academy" element={<AcademyHomeRedirect />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.ACADEMY_BROWSE)} />}>
            <Route path="/app/academy/registrations" element={<MyRegistrationsPage />} />
            <Route path="/app/academy/registrations/:id/pay" element={<PayRegistrationPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.ACADEMY_MANAGE)} />}>
            <Route path="/app/academy/formations" element={<MyFormationsPage />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) =>
                  hasPermission(user, PERMS.MARKETPLACE_MANAGE) || hasPermission(user, PERMS.MARKETPLACE_BROWSE)
                }
              />
            }
          >
            <Route path="/app/marketplace" element={<Navigate to="/marketplace/products" replace />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.MARKETPLACE_MANAGE)} />}>
            <Route path="/app/marketplace/mine" element={<MyProductsPage />} />
            <Route path="/app/marketplace/requests" element={<MarketplaceRequestsPage />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.SERVICES_MANAGE) || hasPermission(user, PERMS.SERVICES_BROWSE)}
              />
            }
          >
            <Route path="/app/services" element={<ServicesHomeRedirect />} />
            <Route path="/app/services/requests" element={<MyQuoteRequestsPage />} />
            <Route path="/services/providers/:id" element={<ProviderProfilePage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.SERVICES_BROWSE)} />}>
            <Route path="/services/providers" element={<ProviderSearchPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.SERVICES_MANAGE)} />}>
            <Route path="/app/services/mine" element={<MyServicesPage />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.EVENTS_MANAGE) || hasPermission(user, PERMS.EVENTS_BROWSE)}
              />
            }
          >
            <Route path="/app/events" element={<ModuleWorkspacePage workspace="events" />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.CONTENT_PUBLISH) || hasPermission(user, PERMS.CONTENT_BROWSE)}
              />
            }
          >
            <Route path="/app/content" element={<ModuleWorkspacePage workspace="content" />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.ADMIN_VERIFICATIONS)} />}>
            <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.ADMIN_USERS)} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/users" element={<Navigate to="/users" replace />} />
          </Route>
          <Route
            element={
              <RoleRoute
                allow={(user) => hasPermission(user, PERMS.ADMIN_CONFIG) || hasPermission(user, PERMS.ADMIN_ROLES)}
              />
            }
          >
            <Route path="/admin/config" element={<AdminConfigHubPage />} />
            <Route path="/admin/config/:section" element={<AdminConfigSectionPage />} />
          </Route>
          <Route element={<RoleRoute allow={(user) => hasPermission(user, PERMS.ADMIN_MODULES) || isSuperAdmin(user)} />}>
            <Route path="/admin" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/admin/:module" element={<AdminModulePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
