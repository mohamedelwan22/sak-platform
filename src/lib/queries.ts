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
    return res.data.data;
  },
});

export const landsQuery = queryOptions({
  queryKey: ["lands"],
  queryFn: async () => {
    const res = await publicApi.lands();
    return res.data.data;
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

export function sakPrice(
  gold?: { gram_price_usd: number } | null,
  config?: { sak_to_gold_ratio: number } | null,
): number | null {
  if (!gold || !config) return null;
  return Number(gold.gram_price_usd) * Number(config.sak_to_gold_ratio);
}
