import { queryOptions } from "@tanstack/react-query";
import { publicApi } from "@/api/public.api";

export const goldQuery = queryOptions({
  queryKey: ["gold-price"],
  queryFn: async () => {
    const res = await publicApi.goldPrice();
    return res.data.data;
  },
  refetchInterval: 60_000,
});

export const configQuery = queryOptions({
  queryKey: ["sak-config"],
  queryFn: async () => {
    const res = await publicApi.sakConfig();
    return res.data.data;
  },
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const res = await publicApi.projects();
    const d = res.data.data;
    return Array.isArray(d) ? d : ((d?.data as unknown[] | undefined) ?? []);
  },
});

export const landsQuery = queryOptions({
  queryKey: ["lands"],
  queryFn: async () => {
    const res = await publicApi.lands();
    const d = res.data.data;
    return Array.isArray(d) ? d : ((d?.data as unknown[] | undefined) ?? []);
  },
});

export const landQuery = (id: string) =>
  queryOptions({
    queryKey: ["land", id],
    queryFn: async () => {
      const res = await publicApi.landById(id);
      return res.data.data;
    },
  });

export const goldHistoryQuery = (period?: string) =>
  queryOptions({
    queryKey: ["gold-history", period],
    queryFn: async () => {
      const res = await publicApi.goldHistory({ period });
      return res.data.data;
    },
  });

export const sakPriceQuery = queryOptions({
  queryKey: ["sak-price"],
  queryFn: async () => {
    const res = await publicApi.sakPrice();
    return res.data.data;
  },
  refetchInterval: 60_000,
});

// ── Phase 07: live gold & SAK market quotes (backend 30s cache) ──

export interface MarketQuote {
  gold: {
    symbol: "XAU";
    pricePerOunce: string;
    pricePerGram: string;
    currency: string;
  };
  sak: {
    goldWeightGrams: string;
    priceUSD: string;
    sellFeePercent: string;
  };
  source: string;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  updatedAt: string;
  isStale: boolean;
  goldPriceHistoryId: string | null;
}

/** Live gold market quote — refreshed every 45s (backend caches for 30s). */
export const marketGoldQuery = queryOptions({
  queryKey: ["market-gold"],
  queryFn: async () => {
    const res = await publicApi.marketGoldCurrent();
    return res.data.data as MarketQuote;
  },
  refetchInterval: 45_000,
});

/** Live SAK market quote — refreshed every 45s (backend caches for 30s). */
export const marketSakPriceQuery = queryOptions({
  queryKey: ["market-sak-price"],
  queryFn: async () => {
    const res = await publicApi.marketSakPrice();
    return res.data.data as MarketQuote;
  },
  refetchInterval: 45_000,
});

/** Historical gold prices from the append-only market feed. */
export const marketGoldHistoryQuery = (params?: {
  from?: string;
  to?: string;
  limit?: number;
  sortOrder?: "asc" | "desc";
}) =>
  queryOptions({
    queryKey: ["market-gold-history", params],
    queryFn: async () => {
      const res = await publicApi.marketGoldHistory(params);
      return res.data.data as {
        data: Array<{
          id: string;
          price_per_ounce: string;
          price_per_gram: string;
          currency: string;
          source: string;
          fetched_at: string;
        }>;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    },
  });

export function sakPrice(
  gold?: { gram_price_usd: number } | null,
  config?: { sak_to_gold_ratio: number } | null,
): number | null {
  if (!gold || !config) return null;
  return Number(gold.gram_price_usd) * Number(config.sak_to_gold_ratio);
}
