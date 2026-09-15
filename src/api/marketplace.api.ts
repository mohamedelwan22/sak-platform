import { apiClient } from "@/api/client";

export interface MarketplaceBuyInput {
  landId: string;
  sakAmount: number;
}

export interface MarketplaceSellInput {
  sakAmount: string;
  method?: string;
  holdingId?: string | null;
}

export interface MarketplaceConvertInput {
  direction: "buy" | "sell";
  landId?: string;
  sakAmount: string | number;
  method?: string;
  holdingId?: string | null;
}

export const marketplaceApi = {
  getCatalog: () => apiClient.get("/marketplace/catalog"),

  getMyOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get("/marketplace/orders", { params }),

  buySak: (input: MarketplaceBuyInput) =>
    apiClient.post("/marketplace/buy", {
      landId: input.landId,
      sakAmount: input.sakAmount,
    }),

  sellSak: (input: MarketplaceSellInput) =>
    apiClient.post("/marketplace/sell", {
      sakAmount: String(input.sakAmount),
      method: input.method ?? "bank_transfer",
      holdingId: input.holdingId ?? null,
    }),

  convert: (input: MarketplaceConvertInput) =>
    apiClient.post("/marketplace/convert", {
      direction: input.direction,
      landId: input.landId,
      sakAmount: String(input.sakAmount),
      method: input.method ?? "bank_transfer",
      holdingId: input.holdingId ?? null,
    }),
};
