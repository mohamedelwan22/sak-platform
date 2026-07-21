import { apiClient } from "./client";

export const publicApi = {
  goldPrice: () => apiClient.get("/public/gold-price"),
  sakConfig: () => apiClient.get("/public/sak-config"),
  projects: () => apiClient.get("/public/projects"),
  lands: () => apiClient.get("/public/lands"),
  landById: (id: string) => apiClient.get(`/public/lands/${id}`),
};
