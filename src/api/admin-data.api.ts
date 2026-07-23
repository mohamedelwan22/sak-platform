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

  landList: (params?: { search?: string; status?: string; assetType?: string; projectId?: string; page?: number; limit?: number }) =>
    apiClient.get("/lands", { params }),
  landGetById: (id: string) => apiClient.get(`/lands/${id}`),
  landSave: (data: Record<string, unknown>) => apiClient.post("/lands", data),
  landUpdate: (id: string, data: Record<string, unknown>) => apiClient.put(`/lands/${id}`, data),
  landDelete: (id: string) => apiClient.delete(`/lands/${id}`),

  chartData: () => apiClient.get("/admin/chart-data"),
  activity: () => apiClient.get("/admin/activity"),
  exportCsv: (entity: string, params?: Record<string, string>) =>
    apiClient.get(`/admin/export/${entity}`, { params, responseType: "blob" }),

  projectList: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    apiClient.get("/projects", { params }),
  projectGetById: (id: string) => apiClient.get(`/projects/${id}`),
  projectSave: (data: Record<string, unknown>) => apiClient.post("/projects", data),
  projectUpdate: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/projects/${id}`, data),
  projectDelete: (id: string) => apiClient.delete(`/projects/${id}`),

  goldList: (params?: { page?: number; limit?: number }) => apiClient.get("/gold", { params }),
  goldLatest: () => apiClient.get("/gold/latest"),
  goldHistory: (params?: { period?: string }) => apiClient.get("/gold/history", { params }),
  goldStatistics: (params?: { period?: string }) => apiClient.get("/gold/statistics", { params }),
  goldCreate: (data: Record<string, unknown>) => apiClient.post("/gold", data),
  goldDelete: (id: string) => apiClient.delete(`/gold/${id}`),

  sakConfigCurrent: () => apiClient.get("/sak/current"),
  sakConfigAll: () => apiClient.get("/sak/all"),
  sakConfigSave: (data: Record<string, unknown>) => apiClient.post("/sak", data),
  sakConfigUpdate: (id: string, data: Record<string, unknown>) => apiClient.put(`/sak/${id}`, data),
  sakConfigDelete: (id: string) => apiClient.delete(`/sak/${id}`),

  holdingsSummary: () => apiClient.get("/holdings/portfolio-summary"),
};
