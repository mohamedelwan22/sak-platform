import { apiClient } from "./client";

export const publicApi = {
  goldPrice: () => apiClient.get("/public/gold-price"),
  sakConfig: () => apiClient.get("/public/sak-config"),
  sakPrice: () => apiClient.get("/public/sak-price"),
  projects: () => apiClient.get("/public/projects"),
  lands: () => apiClient.get("/public/lands"),
  landById: (id: string) => apiClient.get(`/public/lands/${id}`),
  goldHistory: (params?: { period?: string }) => apiClient.get("/gold/history", { params }),
  goldStatistics: () => apiClient.get("/gold/statistics"),
  homepage: () => apiClient.get("/cms/homepage"),
  assetFieldValues: (landId: string) => apiClient.get(`/cms/asset-field-values/${landId}`),
  marketGoldCurrent: () => apiClient.get("/market/gold/current"),
  marketSakPrice: () => apiClient.get("/market/sak-price"),
  marketGoldHistory: (params?: {
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sortOrder?: "asc" | "desc";
  }) => apiClient.get("/market/gold/history", { params }),
};
