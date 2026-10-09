import { api } from "@/shared/api/client";

export type ProductCategory = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type SupplierSummary = {
  id: string;
  displayName: string;
  logoUploadId: string | null;
  city: string | null;
};

export type ItemCondition = "NEW" | "LIKE_NEW" | "USED";

export const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "Neuf",
  LIKE_NEW: "Comme neuf",
  USED: "Occasion",
};

export function conditionLabel(value: string | null | undefined) {
  return CONDITION_LABELS[(value ?? "NEW") as ItemCondition] ?? "Neuf";
}

export function formatPrice(amount: string | number | null | undefined, currency: string | null | undefined) {
  if (amount == null || amount === "") return null;
  const value = Number(amount);
  if (Number.isNaN(value)) return null;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} ${currency ?? ""}`.trim();
}

export type ProductCard = {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  firstPhotoUploadId: string | null;
  supplier: SupplierSummary | null;
  condition: ItemCondition;
};

export type ProductPage = {
  items: ProductCard[];
  total: number;
  page: number;
  size: number;
};

export type Product = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  brand: string | null;
  description: string | null;
  technicalSheet: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  photoUploadIds: string[];
  videos: string[];
  active: boolean;
  condition: ItemCondition;
  viewCount: number;
  hiddenByAdmin: boolean;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductDetail = {
  product: Product;
  supplier: SupplierSummary | null;
};

export type QuoteRequestStatus = {
  id: string;
  status: "PENDING_VERIFICATION" | "SENT" | "HANDLED";
};

export type ReceivedQuoteRequest = {
  id: string;
  productId: string;
  productName: string;
  email: string;
  fullName: string;
  phone: string | null;
  message: string;
  status: "SENT" | "HANDLED";
  createdAt: string;
  handledAt: string | null;
};

export type ProductSearchParams = {
  q?: string;
  categoryId?: string;
  condition?: ItemCondition | "";
  page?: number;
  size?: number;
};

export type SupplierStats = {
  products: number;
  published: number;
  drafts: number;
  hidden: number;
  views: number;
  conversations: number;
  unreadConversations: number;
};

export type Counterpart = { id: string; displayName: string; subtitle: string | null };

export type Conversation = {
  id: string;
  productId: string | null;
  productName: string;
  productPhotoUploadId: string | null;
  productPriceAmount: string | null;
  productPriceCurrency: string | null;
  productAvailable: boolean;
  viewerRole: "BUYER" | "SUPPLIER";
  counterpart: Counterpart;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export type MarketplaceMessage = {
  id: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  body: string;
  createdAt: string;
};

export type ConversationThread = { conversation: Conversation; messages: MarketplaceMessage[] };

export type AdminMarketplaceStats = {
  products: number;
  visible: number;
  hidden: number;
  inactive: number;
  suppliers: number;
  activeSuppliers: number;
  conversations: number;
  newConversations7d: number;
};

export type AdminProductRow = {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string;
  categoryName: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  condition: ItemCondition;
  firstPhotoUploadId: string | null;
  supplierId: string;
  supplierName: string;
  supplierEmail: string | null;
  active: boolean;
  hiddenByAdmin: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  viewCount: number;
  conversationCount: number;
  createdAt: string;
};

export type AdminProductStatus = "ALL" | "VISIBLE" | "HIDDEN" | "INACTIVE";

export type AdminSupplierRow = {
  id: string;
  displayName: string;
  email: string;
  city: string | null;
  enabled: boolean;
  productCount: number;
  visibleCount: number;
  hiddenCount: number;
  conversationCount: number;
  createdAt: string;
};

export function fetchProductCategories() {
  return api.get<ProductCategory[]>("/v1/marketplace/categories");
}

export function fetchAdminProductCategories() {
  return api.get<ProductCategory[]>("/v1/admin/marketplace/categories");
}

export function saveProductCategory(id: string | null, request: { name: string; sortOrder: number; active: boolean }) {
  return id
    ? api.put<ProductCategory>(`/v1/admin/marketplace/categories/${id}`, request)
    : api.post<ProductCategory>("/v1/admin/marketplace/categories", request);
}

export function deleteProductCategory(id: string) {
  return api.delete<void>(`/v1/admin/marketplace/categories/${id}`);
}

export function fetchProducts(params: ProductSearchParams = {}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.condition) query.set("condition", params.condition);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 12));
  return api.get<ProductPage>(`/v1/marketplace/products?${query.toString()}`);
}

export function fetchProductDetail(id: string) {
  return api.get<ProductDetail>(`/v1/marketplace/products/${id}`);
}

export function productPhotoUrl(productId: string, uploadId: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
  return `${base}/v1/marketplace/products/${productId}/files/${uploadId}`;
}

export function createGuestQuoteRequest(
  productId: string,
  request: { fullName: string; email: string; phone?: string; message: string },
) {
  return api.post<QuoteRequestStatus>(`/v1/marketplace/products/${productId}/quote-requests`, request);
}

export function confirmGuestQuoteRequest(requestId: string, code: string) {
  return api.post<QuoteRequestStatus>(`/v1/marketplace/quote-requests/${requestId}/confirm`, { code });
}

export function resendGuestQuoteRequest(requestId: string) {
  return api.post<void>(`/v1/marketplace/quote-requests/${requestId}/resend`);
}

export function fetchMyProducts() {
  return api.get<Product[]>("/v1/marketplace/mine");
}

export function saveProduct(
  id: string | null,
  request: {
    categoryId: string;
    name: string;
    brand: string | null;
    description: string | null;
    technicalSheet: string | null;
    priceAmount: string | null;
    priceCurrency: string | null;
    photoUploadIds: string[];
    videos: string[];
    active: boolean;
    condition: ItemCondition;
  },
) {
  return id ? api.put<Product>(`/v1/marketplace/mine/${id}`, request) : api.post<Product>("/v1/marketplace/mine", request);
}

export function deleteProduct(id: string) {
  return api.delete<void>(`/v1/marketplace/mine/${id}`);
}

export function uploadProductPhoto(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.postForm<{ uploadId: string }>("/v1/marketplace/mine/photos", form);
}

export function fetchReceivedMarketplaceRequests() {
  return api.get<ReceivedQuoteRequest[]>("/v1/marketplace/quote-requests/received");
}

export function handleMarketplaceRequest(id: string) {
  return api.post<ReceivedQuoteRequest>(`/v1/marketplace/quote-requests/${id}/handle`);
}

export function fetchSupplierStats() {
  return api.get<SupplierStats>("/v1/marketplace/mine/stats");
}

export function contactSupplier(productId: string, body: string) {
  return api.post<Conversation>(`/v1/marketplace/products/${productId}/conversations`, { body });
}

export function fetchProductConversation(productId: string) {
  return api.get<{ conversationId: string | null }>(`/v1/marketplace/products/${productId}/conversation`);
}

export function fetchConversations() {
  return api.get<Conversation[]>("/v1/marketplace/conversations");
}

export function fetchConversation(id: string) {
  return api.get<ConversationThread>(`/v1/marketplace/conversations/${id}`);
}

export function sendConversationMessage(id: string, body: string) {
  return api.post<MarketplaceMessage>(`/v1/marketplace/conversations/${id}/messages`, { body });
}

export function fetchMarketplaceUnread() {
  return api.get<{ count: number }>("/v1/marketplace/conversations/unread-count");
}

export function fetchAdminMarketplaceStats() {
  return api.get<AdminMarketplaceStats>("/v1/admin/marketplace/stats");
}

export function fetchAdminProducts(params: {
  q?: string;
  status?: AdminProductStatus;
  categoryId?: string;
  supplierId?: string;
  page?: number;
  size?: number;
}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.status) query.set("status", params.status);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.supplierId) query.set("supplierId", params.supplierId);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));
  return api.get<{ items: AdminProductRow[]; total: number; page: number; size: number }>(
    `/v1/admin/marketplace/products?${query.toString()}`,
  );
}

export function hideProduct(id: string, reason: string) {
  return api.post<AdminProductRow>(`/v1/admin/marketplace/products/${id}/hide`, { reason });
}

export function unhideProduct(id: string) {
  return api.post<AdminProductRow>(`/v1/admin/marketplace/products/${id}/unhide`);
}

export function fetchAdminSuppliers() {
  return api.get<AdminSupplierRow[]>("/v1/admin/marketplace/suppliers");
}
