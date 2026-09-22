import { apiClient } from "./client";

/** Normalize a Phase 04 list response (handles both plain arrays and {data,pagination}). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function unwrapRows(res: unknown): any[] {
  const payload = (res as { data?: { data?: unknown } })?.data?.data;
  if (Array.isArray(payload)) return payload;
  const nested = payload as { data?: unknown } | undefined;
  if (nested && Array.isArray(nested.data)) return nested.data as unknown[];
  return [];
}

export const brokerApi = {
  createProfile: (data: Record<string, unknown>) => apiClient.post("/brokers/profile", data),
  me: () => apiClient.get("/brokers/me"),
  updateMe: (data: Record<string, unknown>) => apiClient.patch("/brokers/me", data),
  get: (id: string) => apiClient.get(`/brokers/${id}`),
  clients: (id: string) => apiClient.get(`/brokers/${id}/clients`),
};

export const affiliateApi = {
  referralLink: () => apiClient.get("/affiliate/referral-link"),
  stats: () => apiClient.get("/affiliate/stats"),
  commissions: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/affiliate/commissions", { params }),
  withdrawalRequest: (commissionIds: string[]) =>
    apiClient.post("/affiliate/withdrawal-request", { commissionIds }),
};

export const leadsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/leads", { params }),
  get: (id: string) => apiClient.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post("/leads", data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/leads/${id}/status`, { status, notes }),
  assign: (id: string, brokerId: string, reason?: string) =>
    apiClient.post(`/leads/${id}/assign`, { brokerId, reason }),
};

export const viewingsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/viewings", { params }),
  create: (data: Record<string, unknown>) => apiClient.post("/viewings", data),
  updateStatus: (id: string, status: string, scheduledAt?: string, notes?: string) =>
    apiClient.patch(`/viewings/${id}/status`, { status, scheduledAt, notes }),
};

export const bookingsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/bookings", { params }),
  create: (data: Record<string, unknown>) => apiClient.post("/bookings", data),
  updateStatus: (id: string, status: string, notes?: string) =>
    apiClient.patch(`/bookings/${id}/status`, { status, notes }),
};

export const commissionsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/commissions", { params }),
  approve: (commissionIds: string[]) => apiClient.post("/commissions/approve", { commissionIds }),
  reject: (commissionIds: string[], reason: string) =>
    apiClient.post("/commissions/reject", { commissionIds, reason }),
};

export const adminPhase04Api = {
  brokers: (params?: {
    verificationStatus?: string;
    statuses?: string;
    search?: string;
    isActive?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get("/admin/brokers", { params }),
  verifyBroker: (id: string, status: string, rejectionReason?: string) =>
    apiClient.patch(`/admin/brokers/${id}/verify`, { status, rejectionReason }),
  deactivateBroker: (id: string) => apiClient.patch(`/admin/brokers/${id}/deactivate`),
  activateBroker: (id: string) => apiClient.patch(`/admin/brokers/${id}/activate`),

  customers: (params?: { status?: string; kycStatus?: string; page?: number; limit?: number }) =>
    apiClient.get("/admin/customers", { params }),
  updateCustomerStatus: (id: string, status: string) =>
    apiClient.patch(`/admin/customers/${id}/status`, { status }),

  commissions: (params?: { page?: number; limit?: number }) =>
    apiClient.get("/admin/commissions", { params }),
  approveCommissions: (commissionIds: string[]) =>
    apiClient.post("/admin/commissions/approve", { commissionIds }),
  rejectCommissions: (commissionIds: string[], reason: string) =>
    apiClient.post("/admin/commissions/reject", { commissionIds, reason }),

  assetTypes: (params?: { page?: number; limit?: number }) =>
    apiClient.get("/admin/asset-types", { params }),
  createAssetType: (data: Record<string, unknown>) => apiClient.post("/admin/asset-types", data),
  createAssetField: (typeId: string, data: Record<string, unknown>) =>
    apiClient.post(`/cms/asset-types/${typeId}/fields`, data),
  saveAssetFieldValues: (landId: string, values: Record<string, unknown>) =>
    apiClient.put(`/cms/asset-field-values/${landId}`, { values }),

  homepage: () => apiClient.get("/admin/homepage"),
  updateHomepage: (data: Record<string, unknown>) => apiClient.patch("/admin/homepage", data),

  attributionCorrections: (params?: { page?: number; limit?: number }) =>
    apiClient.get("/admin/attribution-corrections", { params }),
  correctAttribution: (holdingId: string, newBrokerId: string, reason: string) =>
    apiClient.post(`/admin/holdings/${holdingId}/attribution`, { newBrokerId, reason }),
  auditLog: (params?: { page?: number; limit?: number }) => apiClient.get("/admin/activity"),
};

export const investmentRequestsApi = {
  create: (data: {
    landId: string;
    amountUsd: number;
    brokerId?: string | null;
    source?: string;
  }) => apiClient.post("/investment-requests", data),
  list: (params?: { status?: string; source?: string; page?: number; limit?: number }) =>
    apiClient.get("/investment-requests", { params }),
  get: (id: string) => apiClient.get(`/investment-requests/${id}`),
  updateStatus: (id: string, status: string, note?: string) =>
    apiClient.patch(`/investment-requests/${id}/status`, { status, note }),
  stats: () => apiClient.get("/investment-requests/stats"),
  // Task 6: manual payment proof lifecycle
  uploadPaymentProof: (id: string, file: File, paymentMethod?: string) => {
    const formData = new FormData();
    formData.append("proof", file);
    if (paymentMethod) formData.append("paymentMethod", paymentMethod);
    return apiClient.post(`/investment-requests/${id}/payment-proof`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  confirmPayment: (id: string, note?: string) =>
    apiClient.post(`/investment-requests/${id}/payment/confirm`, { note }),
  rejectPayment: (id: string, reason: string) =>
    apiClient.post(`/investment-requests/${id}/payment/reject`, { reason }),
};

/** Task 6: investment request payment sub-states (server is authoritative). */
export const INVESTMENT_PAYMENT_STATUS = {
  PENDING: "payment_pending",
  PROOF_UPLOADED: "proof_uploaded",
  UNDER_REVIEW: "payment_under_review",
  CONFIRMED: "payment_confirmed",
  REJECTED: "payment_rejected",
} as const;

export interface InvestmentRequestRow {
  id: string;
  userId: string;
  landId: string;
  brokerId: string | null;
  amountUsd: string | number;
  source: string;
  status: string;
  reviewNote: string | null;
  rejectionReason: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentProofPath: string | null;
  paymentProofUploadedAt: string | null;
  paymentReviewedAt: string | null;
  paymentNote: string | null;
  reviewedAt: string | null;
  holdingId: string | null;
  createdAt: string;
  updatedAt: string;
  land?: {
    id: string;
    titleAr?: string;
    title_ar?: string;
    coverImageUrl?: string | null;
    cover_image_url?: string | null;
  } | null;
  broker?: { id: string; displayName: string; company?: string | null } | null;
  investor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
  holding?: { sakOwned: string | number } | null;
}

export interface ListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function unwrapPagination(res: unknown): ListPagination | null {
  const payload = (res as { data?: { data?: unknown } })?.data?.data;
  const pagination = (payload as { pagination?: ListPagination } | undefined)?.pagination;
  return pagination ?? null;
}

export const eligibleBrokersApi = {
  list: () =>
    apiClient.get("/brokers", { params: { verificationStatus: "verified", isActive: "true" } }),
};
