import { apiClient } from "@/api/client";

export const holdingsApi = {
  getRealAssets: () => apiClient.get("/holdings/real-assets"),
  getMyHoldings: () => apiClient.get("/holdings/me"),
  getPortfolioSummary: () => apiClient.get("/holdings/portfolio-summary"),
};
