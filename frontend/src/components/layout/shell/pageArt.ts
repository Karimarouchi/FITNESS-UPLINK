import type { AuthUser } from "@/features/auth/types";
import { isSuperAdmin } from "@/features/auth/types";

// Matched on whole path segments, first hit wins: keep a longer path above its parent.
const ROUTE_ART: [string, string][] = [
  ["/users", "users"],
  ["/admin/verifications", "verifications"],
  ["/admin/config/roles", "roles-permissions"],
  ["/admin/subscriptions", "subscriptions"],
  ["/admin/marketplace", "marketplace"],
  ["/admin/recruitment", "recruitment"],
  ["/admin/coaching", "coaching"],
  ["/admin/services", "services"],
  ["/admin/formation", "formation"],
  ["/admin/events", "events"],
  ["/admin/news", "news"],
  ["/app/billing", "subscriptions"],
  ["/app/profile/plan", "subscriptions"],
  ["/app/profile/payment", "subscriptions"],
  ["/app/profile", "users"],
  ["/app/settings", "roles-permissions"],
  ["/notifications", "messages"],
  ["/app/opportunities", "opportunities"],
  ["/job-offers", "opportunities"],
  ["/app/applications", "applications"],
  ["/applications", "applications"],
  ["/candidates", "recruitment"],
  ["/favorites", "users"],
  ["/app/cv", "recruitment"],
  ["/app/certifications", "verifications"],
  ["/app/videos", "news"],
  ["/app/availability", "coach-agenda"],
  ["/contracts", "contracts"],
  ["/app/coaching/agenda", "coach-agenda"],
  ["/app/coaching/bookings", "coach-agenda"],
  ["/app/coaching/services", "coaching"],
  ["/app/coaching/packs", "coaching"],
  ["/coaches", "coaching"],
  ["/app/marketplace/mine", "supplier-products"],
  ["/app/marketplace/messages", "messages"],
  ["/app/academy", "formation"],
  ["/app/events", "events"],
  ["/app/content", "news"],
  ["/app/services", "services"],
  ["/services/providers", "services"],
];

/** The illustration shown in the header of a page, read by the `[data-art]` rule in rail.css. */
export function pageArtFor(pathname: string, user: AuthUser | null | undefined) {
  // Other roles' dashboards place their own illustrations.
  if (pathname === "/app/dashboard") return isSuperAdmin(user) ? "admin-dashboard" : null;
  const hit = ROUTE_ART.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return hit ? hit[1] : null;
}
