import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";

export type CoachCard = {
  id: string;
  displayName: string;
  title: string | null;
  city: string | null;
  country: CountrySummary | null;
  specialties: string[];
  photoUploadId: string | null;
  averageRating: number;
  reviewCount: number;
  fromPriceAmount: string | null;
  fromPriceCurrency: string | null;
};

export type CoachPage = {
  items: CoachCard[];
  total: number;
  page: number;
  size: number;
};

export type CoachService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: string;
  priceCurrency: string;
  active: boolean;
};

export type Review = {
  id: string;
  clientDisplayName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type CoachProfile = CoachCard & {
  biography: string | null;
  services: CoachService[];
  reviews: Review[];
  canReview: boolean;
  myRating: number | null;
};

export type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export type AvailabilityException = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

export type TimeSlot = {
  start: string;
  end: string;
  available: boolean;
};

export type PackOffer = {
  id: string;
  packType: "SINGLE" | "FIVE" | "TEN" | "MONTHLY" | "CUSTOM";
  sessionCount: number | null;
  priceAmount: string;
  priceCurrency: string;
  validityDays: number | null;
  active: boolean;
};

export type CoachingPack = {
  id: string;
  coachId: string;
  coachDisplayName: string;
  offerId: string;
  packType: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  priceAmount: string;
  priceCurrency: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED";
  purchasedAt: string;
  expiresAt: string | null;
};

export type Booking = {
  id: string;
  coachId: string;
  coachDisplayName: string | null;
  clientId: string;
  clientDisplayName: string | null;
  coachServiceId: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "PENDING" | "AWAITING_PAYMENT" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  priceAmount: string;
  priceCurrency: string;
  packId: string | null;
  reviewed: boolean;
  createdAt: string;
  suggestedSlots: string[];
};

export type CoachingMessage = {
  id: string;
  senderId: string;
  senderDisplayName: string;
  body: string | null;
  uploadId: string | null;
  createdAt: string;
};

export type CoachAgendaSummary = {
  sessionsThisWeek: number;
  activeClients: number;
  activePacks: number;
  averageRating: number;
  pendingRequests: number;
};

export type CoachSearchParams = {
  q?: string;
  countryId?: string;
  city?: string;
  specialty?: string;
  sort?: "recent" | "rating" | "name";
  page?: number;
  size?: number;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
};

export function confirmBooking(id: string) {
  return api.post<Booking>(`/v1/coaching/bookings/${id}/confirm`, {});
}

export function declineBooking(id: string, suggestedSlots?: string[]) {
  return api.post<Booking>(`/v1/coaching/bookings/${id}/decline`, suggestedSlots?.length ? { suggestedSlots } : {});
}

export function fetchDirectMessages(coachId: string) {
  return api.get<DirectMessage[]>(`/v1/coaches/${coachId}/messages`);
}

export function sendDirectMessage(coachId: string, body: string) {
  return api.post<DirectMessage>(`/v1/coaches/${coachId}/messages`, { body });
}

export type MemberInboxItem = {
  coachId: string;
  coachDisplayName: string;
  lastBody: string;
  lastAt: string;
};

/** Member fetches their inbox — list of coaches with latest message */
export function fetchMemberInbox() {
  return api.get<MemberInboxItem[]>("/v1/coaching/messages/mine");
}

export type CoachInboxItem = {
  memberId: string;
  memberDisplayName: string;
  lastBody: string;
  lastAt: string;
};

/** Coach fetches their inbox — list of members with latest message */
export function fetchCoachInbox(coachId: string) {
  return api.get<CoachInboxItem[]>(`/v1/coaches/${coachId}/messages/inbox`);
}

/** Coach fetches full thread with a specific member */
export function fetchCoachMemberThread(coachId: string, memberId: string) {
  return api.get<DirectMessage[]>(`/v1/coaches/${coachId}/messages/member/${memberId}`);
}

/** Coach replies to a member */
export function replyToMember(coachId: string, memberId: string, body: string) {
  return api.post<DirectMessage>(`/v1/coaches/${coachId}/messages/member/${memberId}`, { body });
}

export function fetchCoaches(params: CoachSearchParams = {}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.city?.trim()) query.set("city", params.city.trim());
  if (params.specialty) query.set("specialty", params.specialty);
  if (params.sort) query.set("sort", params.sort);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 12));
  return api.get<CoachPage>(`/v1/coaches?${query.toString()}`);
}

export function fetchCoachProfile(id: string) {
  return api.get<CoachProfile>(`/v1/coaches/${id}`);
}

export function fetchCoachPackOffers(coachId: string) {
  return api.get<PackOffer[]>(`/v1/coaches/${coachId}/pack-offers`);
}

export function fetchCoachAvailability(coachId: string, serviceId: string, date: string) {
  return api.get<TimeSlot[]>(`/v1/coaches/${coachId}/availability?serviceId=${serviceId}&date=${date}`);
}

export function fetchNextAvailableDate(coachId: string, serviceId: string) {
  return api.get<{ date: string | null }>(`/v1/coaches/${coachId}/availability/next?serviceId=${serviceId}`);
}

export function fetchCoachPhoto(coachId: string, uploadId: string) {
  return api.getBlob(`/v1/coaches/${coachId}/files/${uploadId}`);
}

export function createBooking(request: { coachServiceId: string; scheduledAt: string; durationMinutes?: number }) {
  return api.post<Booking>("/v1/coaching/bookings", request);
}

export function payBooking(id: string, cardNumber: string) {
  return api.post<Booking>(`/v1/coaching/bookings/${id}/pay`, { cardNumber });
}

export function fetchBooking(id: string) {
  return api.get<Booking>(`/v1/coaching/bookings/${id}`);
}

export function fetchMyBookings() {
  return api.get<Booking[]>("/v1/coaching/bookings/mine");
}

export function fetchCoachBookings() {
  return api.get<Booking[]>("/v1/coaching/bookings/coach");
}

export function cancelBooking(id: string, reason?: string) {
  return api.post<Booking>(`/v1/coaching/bookings/${id}/cancel`, reason ? { reason } : undefined);
}

export function submitCoachReview(coachId: string, rating: number, comment?: string) {
  return api.post<void>(`/v1/coaches/${coachId}/review`, { rating, comment });
}

export function submitReview(bookingId: string, rating: number, comment?: string) {
  return api.post<void>(`/v1/coaching/bookings/${bookingId}/review`, { rating, comment });
}

export function purchasePack(offerId: string, cardNumber: string) {
  return api.post<CoachingPack>("/v1/coaching/packs/purchase", { offerId, cardNumber });
}

export function fetchMyPacks() {
  return api.get<CoachingPack[]>("/v1/coaching/packs/mine");
}

export function fetchSoldPacks() {
  return api.get<CoachingPack[]>("/v1/coaching/packs/sold");
}

export function fetchThread(bookingId: string) {
  return api.get<CoachingMessage[]>(`/v1/coaching/bookings/${bookingId}/messages`);
}

export function sendMessage(bookingId: string, body: string, uploadId?: string) {
  return api.post<CoachingMessage>(`/v1/coaching/bookings/${bookingId}/messages`, { body, uploadId });
}

export function fetchCoachServices() {
  return api.get<CoachService[]>("/v1/coaching/services");
}

export function saveCoachService(id: string | null, request: Omit<CoachService, "id">) {
  return id ? api.put<CoachService>(`/v1/coaching/services/${id}`, request) : api.post<CoachService>("/v1/coaching/services", request);
}

export function deleteCoachService(id: string) {
  return api.delete<void>(`/v1/coaching/services/${id}`);
}

export function fetchAvailabilityRules() {
  return api.get<AvailabilityRule[]>("/v1/coaching/availability/rules");
}

export function createAvailabilityRule(request: { dayOfWeek: number; startTime: string; endTime: string }) {
  return api.post<AvailabilityRule>("/v1/coaching/availability/rules", request);
}

export function deleteAvailabilityRule(id: string) {
  return api.delete<void>(`/v1/coaching/availability/rules/${id}`);
}

export function fetchAvailabilityExceptions(from: string, to: string) {
  return api.get<AvailabilityException[]>(`/v1/coaching/availability/exceptions?from=${from}&to=${to}`);
}

export function createAvailabilityException(request: { date: string; startTime?: string; endTime?: string; note?: string }) {
  return api.post<AvailabilityException>("/v1/coaching/availability/exceptions", request);
}

export function deleteAvailabilityException(id: string) {
  return api.delete<void>(`/v1/coaching/availability/exceptions/${id}`);
}

export function fetchMyPackOffers() {
  return api.get<PackOffer[]>("/v1/coaching/pack-offers");
}

export function savePackOffer(id: string | null, request: Omit<PackOffer, "id">) {
  return id ? api.put<PackOffer>(`/v1/coaching/pack-offers/${id}`, request) : api.post<PackOffer>("/v1/coaching/pack-offers", request);
}

export function deletePackOffer(id: string) {
  return api.delete<void>(`/v1/coaching/pack-offers/${id}`);
}

export function fetchAgendaSummary() {
  return api.get<CoachAgendaSummary>("/v1/coaching/agenda/summary");
}

export function coachLocation(item: { city: string | null; country: CountrySummary | null }) {
  const parts = [item.city?.trim() || null, item.country ? `${item.country.flagEmoji} ${item.country.name}` : null].filter(Boolean);
  return parts.join(" · ");
}

export const PACK_TYPE_LABELS: Record<string, string> = {
  SINGLE: "1 séance",
  FIVE: "5 séances",
  TEN: "10 séances",
  MONTHLY: "Pack mensuel",
  CUSTOM: "Formule personnalisée",
};

export const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export type CoachSettings = {
  cancellationDeadlineHours: number;
};

export type CoachingReport = {
  id: string;
  bookingId: string;
  reporterDisplayName: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminCoachSummary = {
  id: string;
  displayName: string;
  email: string;
  city: string | null;
  profileVisible: boolean;
  servicesCount: number;
  bookingsCount: number;
  averageRating: number;
};

export type PlatformSettings = {
  commissionRate: string;
};

export function fetchCoachSettings() {
  return api.get<CoachSettings>("/v1/coaching/settings");
}

export function saveCoachSettings(cancellationDeadlineHours: number) {
  return api.put<CoachSettings>("/v1/coaching/settings", { cancellationDeadlineHours });
}

export function reportBooking(bookingId: string, reason: string) {
  return api.post<void>(`/v1/coaching/bookings/${bookingId}/report`, { reason });
}

export function fetchAdminCoaches() {
  return api.get<AdminCoachSummary[]>("/v1/admin/coaching/coaches");
}

export function fetchAdminBookings() {
  return api.get<Booking[]>("/v1/admin/coaching/bookings");
}

export function fetchAdminReports() {
  return api.get<CoachingReport[]>("/v1/admin/coaching/reports");
}

export function resolveReport(id: string, adminNote?: string) {
  return api.post<CoachingReport>(`/v1/admin/coaching/reports/${id}/resolve`, adminNote ? { adminNote } : undefined);
}

export function fetchPlatformSettings() {
  return api.get<PlatformSettings>("/v1/admin/coaching/settings");
}

export function savePlatformSettings(commissionRate: string) {
  return api.put<PlatformSettings>("/v1/admin/coaching/settings", { commissionRate });
}

export type TopCoach = {
  id: string;
  displayName: string;
  title: string | null;
  city: string | null;
  country: CountrySummary | null;
  specialties: string[];
  photoUploadId: string | null;
  averageRating: number;
  reviewCount: number;
  highlightReview: Review | null;
};

export function fetchTopRatedCoaches(limit = 6) {
  return api.get<TopCoach[]>(`/v1/coaches/top-rated?limit=${limit}`);
}

export function topRatedCoachPhotoUrl(coachId: string, uploadId: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
  return `${base}/v1/coaches/top-rated/${coachId}/files/${uploadId}`;
}
