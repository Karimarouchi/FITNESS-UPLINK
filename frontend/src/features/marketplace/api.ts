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

export type ProductCard = {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string;
  priceAmount: string | null;
  priceCurrency: string | null;
  firstPhotoUploadId: string | null;
  supplier: SupplierSummary | null;
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
  page?: number;
  size?: number;
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
