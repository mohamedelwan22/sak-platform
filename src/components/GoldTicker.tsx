import { useQuery } from "@tanstack/react-query";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD } from "@/lib/format";

export function GoldTicker() {
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm">
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
        <span className="text-muted-foreground">الذهب:</span>
        <span className="num font-semibold text-gold">{gold ? `${fmtUSD(Number(gold.gram_price_usd))}/جم` : "…"}</span>
      </span>
      <span className="hidden text-border sm:inline">|</span>
      <span>
        <span className="text-muted-foreground">سعر SAK:</span>{" "}
        <span className="num font-semibold text-foreground">{price != null ? fmtUSD(price) : "…"}</span>
      </span>
      <span className="hidden text-border sm:inline">|</span>
      <span>
        <span className="text-muted-foreground">النسبة:</span>{" "}
        <span className="num font-semibold text-foreground">{config ? `${Number(config.sak_to_gold_ratio)}g` : "…"}</span>
      </span>
      {gold && (
        <span className="text-xs text-muted-foreground/70 ltr:ml-auto rtl:mr-auto">
          آخر تحديث: {new Date(gold.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
