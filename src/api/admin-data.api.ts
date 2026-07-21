import { apiClient } from "./client";

export const adminDataApi = {
  stats: () => apiClient.get("/admin/stats"),

  kycList: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/admin/kyc", { params }),
  kycApprove: (id: string) => apiClient.post(`/admin/kyc/${id}/approve`),
  kycReject: (id: string, data?: { adminNotes?: string }) =>
    apiClient.post(`/admin/kyc/${id}/reject`, data),

  paymentList: (params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get("/admin/payments", { params }),
  paymentApprove: (id: string) => apiClient.post(`/admin/payments/${id}/approve`),
  paymentReject: (id: string, data?: { adminNotes?: string }) =>
    apiClient.post(`/admin/payments/${id}/reject`, data),

  investorList: () => apiClient.get("/investors"),
  landList: () => apiClient.get("/lands"),
  landSave: (data: Record<string, unknown>) => apiClient.post("/lands", data),
  landUpdate: (id: string, data: Record<string, unknown>) => apiClient.put(`/lands/${id}`, data),
};
