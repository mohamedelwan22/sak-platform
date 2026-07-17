import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const goldQuery = queryOptions({
  queryKey: ["gold-price"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("gold_price_history")
      .select("gram_price_usd, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  refetchInterval: 60_000,
});

export const configQuery = queryOptions({
  queryKey: ["sak-config"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("sak_config")
      .select("sak_to_gold_ratio, sell_fee_percent, effective_from")
      .lte("effective_from", new Date().toISOString())
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "active")
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const landsQuery = queryOptions({
  queryKey: ["lands"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("lands")
      .select("*")
      .in("status", ["active", "partially_sold", "sold_out"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const landQuery = (id: string) =>
  queryOptions({
    queryKey: ["land", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lands").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Current SAK price in USD, derived live (BR-002). */
export function sakPrice(
  gold?: { gram_price_usd: number } | null,
  config?: { sak_to_gold_ratio: number } | null,
): number | null {
  if (!gold || !config) return null;
  return Number(gold.gram_price_usd) * Number(config.sak_to_gold_ratio);
}
