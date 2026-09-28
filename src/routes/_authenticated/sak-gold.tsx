import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Coins, Flame, Scale, Percent, Info, AlertTriangle, RefreshCw } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, Spinner, EmptyState } from "@/components/shared/ui-kit";
import {
  marketGoldQuery,
  marketSakPriceQuery,
  marketGoldHistoryQuery,
  configQuery,
} from "@/lib/queries";
import { fmtUSD, fmtNum, fmtDate } from "@/lib/format";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/sak-gold")({
  component: SakGoldPage,
});

const CONVERSION_EXAMPLES: Array<{ sak: number; grams: number }> = [
  { sak: 1, grams: 0.1 },
  { sak: 10, grams: 1 },
  { sak: 100, grams: 10 },
  { sak: 1000, grams: 100 },
];

const SOURCE_LABELS: Record<string, string> = {
  "gold-api": t("_authenticatedSak-gold.k21"),
  "cache-fallback": t("_authenticatedSak-gold.k22"),
  "database-fallback": t("_authenticatedSak-gold.k23"),
  manual_override: t("_authenticatedSak-gold.k24"),
  manual: t("_authenticatedSak-gold.k25"),
  seed: t("_authenticatedSak-gold.k26"),
};

const HISTORY_LIMITS: Array<{ key: number | undefined; label: string }> = [
  { key: undefined, label: t("_authenticatedSak-gold.k27") },
  { key: 7, label: t("_authenticatedSak-gold.k28") },
  { key: 30, label: t("_authenticatedSak-gold.k29") },
];

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return SOURCE_LABELS[source] ?? source;
}

/** t("_authenticatedSak-gold.k30") ticker driven by a 1s heartbeat. */
function useSecondsAgo(iso: string | null | undefined): number | null {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 1000));
}

function fmtAgo(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return t("common.agoSeconds", { v: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("common.agoMinutes", { v: minutes });
  const hours = Math.floor(minutes / 60);
  return t("common.agoHours", { v: hours });
}

function SakGoldPage() {
  const [periodDays, setPeriodDays] = useState<number | undefined>(30);
  const { data: config } = useQuery(configQuery);
  const { data: gold, isLoading: goldLoading } = useQuery(marketGoldQuery);
  const { data: sakPrice, isLoading: sakLoading } = useQuery(marketSakPriceQuery);

  const historyParams = useMemo(() => {
    const limit = periodDays == null ? 100 : 500;
    if (periodDays == null) return { limit, sortOrder: "desc" as const };
    const from = new Date(Date.now() - periodDays * 86_400_000).toISOString();
    return { from, limit, sortOrder: "asc" as const };
  }, [periodDays]);

  const { data: history, isLoading: historyLoading } = useQuery(
    marketGoldHistoryQuery(historyParams),
  );

  const gramPrice = gold ? Number(gold.gold.pricePerGram) : null;
  const ouncePrice = gold ? Number(gold.gold.pricePerOunce) : null;
  const sakPriceUsd = sakPrice ? Number(sakPrice.sak.priceUSD) : null;
  const goldWeight = sakPrice ? Number(sakPrice.sak.goldWeightGrams) : null;
  const sellFee = sakPrice ? Number(sakPrice.sak.sellFeePercent) : null;
  const isStale = gold?.isStale ?? sakPrice?.isStale ?? false;
  const source = gold?.source ?? null;
  const updatedAt = gold?.updatedAt ?? null;
  const secondsAgo = useSecondsAgo(updatedAt);
  const noValidPrice = !goldLoading && !sakLoading && (gramPrice == null || sakPriceUsd == null);

  const chartData = useMemo(() => {
    const rows = history?.data ?? [];
    return rows.map((h) => ({
      date: fmtDate(h.fetched_at),
      price: Number(h.price_per_gram),
    }));
  }, [history]);

  const historyStats = useMemo(() => {
    if (!chartData.length) return null;
    const prices = chartData.map((c) => c.price);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    return { min: Math.min(...prices), max: Math.max(...prices), last, changePct };
  }, [chartData]);

  // Conversion calculator — weight only, independent of the USD market price.
  const ratio = goldWeight ?? (config ? Number(config.sak_to_gold_ratio) : null);
  const [unit, setUnit] = useState<"gram" | "sak">("sak");
  const [amountInput, setAmountInput] = useState<string>("100");

  const amount =
    amountInput !== "" && Number.isFinite(Number(amountInput)) ? Number(amountInput) : null;
  const sakValue =
    unit === "sak" ? amount : ratio && amount != null && ratio > 0 ? amount / ratio : null;
  const gramValue = unit === "gram" ? amount : ratio && amount != null ? amount * ratio : null;
  const usdValue = gramValue != null && gramPrice != null ? gramValue * gramPrice : null;

  return (
    <PortalShell title={t("_authenticatedSak-gold.k13")}>
      {/* Business rule banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-foreground/90">
          {t("_authenticatedSak-gold.k10000")}{" "}
          <span className="num font-bold text-gold">
            {goldWeight != null ? fmtNum(goldWeight, 4) : "—"} {t("_authenticatedSak-gold.k10001")}
          </span>{" "}
          {t("_authenticatedSak-gold.k10000")}
        </p>
      </div>

      {/* Stale / fallback state — never present outdated data as live */}
      {isStale && !noValidPrice && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-foreground/90">
            {t("_authenticatedSak-gold.k10002")}
            {sourceLabel(source)}
            {t("_authenticatedSak-gold.k10002")}
            {t("_authenticatedSak-gold.k10001")}
          </p>
        </div>
      )}

      {noValidPrice && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p className="text-foreground/90">{t("_authenticatedSak-gold.k10002")}</p>
        </div>
      )}

      {/* Live quotes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedSak-gold.k14")}
          value={ouncePrice != null ? fmtUSD(ouncePrice) : "…"}
          subtitle={
            secondsAgo != null
              ? `${fmtAgo(secondsAgo)} • ${sourceLabel(source)}`
              : sourceLabel(source)
          }
          icon={Flame}
          variant="gold"
          isLoading={goldLoading}
        />
        <StatsCard
          title={t("_authenticatedSak-gold.k15")}
          value={gramPrice != null ? fmtUSD(gramPrice) : "…"}
          subtitle={gold?.gold.currency ?? "USD"}
          icon={Flame}
          variant="success"
          isLoading={goldLoading}
        />
        <StatsCard
          title={t("_authenticatedSak-gold.k16")}
          value={sakPriceUsd != null ? fmtUSD(sakPriceUsd) : "…"}
          subtitle={goldWeight != null ? t("sakGold.m1", { v: fmtNum(goldWeight, 4) }) : undefined}
          icon={Coins}
          variant="info"
          isLoading={sakLoading}
        />
        <StatsCard
          title={t("_authenticatedSak-gold.k17")}
          value={sellFee != null ? `${fmtNum(sellFee, 2)}%` : "…"}
          subtitle={t("_authenticatedSak-gold.k18")}
          icon={Percent}
          variant="warning"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* History chart */}
        <div className="card-luxe p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground">{t("_authenticatedSak-gold.k1")}</h2>
              <p className="text-xs text-muted-foreground">{t("_authenticatedSak-gold.k10003")}</p>
            </div>
            <div className="flex rounded-lg bg-secondary p-1">
              {HISTORY_LIMITS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPeriodDays(p.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                    periodDays === p.key
                      ? "bg-gold-gradient text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {historyLoading ? (
            <Spinner />
          ) : chartData.length > 1 ? (
            <div dir="rtl" className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="date"
                    reversed
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                    domain={["auto", "auto"]}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value: number | string) => [
                      fmtUSD(Number(value)),
                      t("_authenticatedSak-gold.k31"),
                    ]}
                    contentStyle={{
                      backgroundColor: "#0A0E1A",
                      border: "1px solid rgba(201,168,76,0.35)",
                      borderRadius: 12,
                      direction: "rtl",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#C9A84C", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={Flame}
              title={t("_authenticatedSak-gold.k19")}
              description={t("_authenticatedSak-gold.k20")}
            />
          )}
        </div>

        <div className="space-y-6">
          {/* Conversion calculator */}
          <div className="card-luxe p-6">
            <h2 className="mb-1 flex items-center gap-2 font-bold text-foreground">
              <Scale className="h-4 w-4 text-gold" />
              {t("sakGold.m1")}
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              {t("_authenticatedSak-gold.k10004")}
            </p>
            <div className="mb-3 flex items-center gap-2">
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "gram" | "sak")}
                className="rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              >
                <option value="sak">SAK</option>
                <option value="gram">{t("_authenticatedSak-gold.k2")}</option>
              </select>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              />
            </div>
            {amount != null && amount > 0 && (
              <div className="mt-4 space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k3")}</span>
                  <span className="num font-bold text-gold">
                    {sakValue != null ? fmtNum(sakValue, 4) : "—"} SAK
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k4")}</span>
                  <span className="num font-bold text-foreground">
                    {gramValue != null ? fmtNum(gramValue, 4) : "—"}{" "}
                    {t("_authenticatedSak-gold.k10004")}
                  </span>
                </p>
                <p className="flex justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">
                    {t("_authenticatedSak-gold.k10005")}
                  </span>
                  <span className="num font-bold text-foreground">
                    {usdValue != null ? fmtUSD(usdValue) : "—"}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Conversion examples */}
          <div className="card-luxe p-6">
            <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedSak-gold.k5")}</h2>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-semibold">SAK</th>
                    <th className="px-4 py-2.5 text-start font-semibold">
                      {t("_authenticatedSak-gold.k6")}
                    </th>
                    <th className="px-4 py-2.5 text-start font-semibold">
                      {t("_authenticatedSak-gold.k7")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CONVERSION_EXAMPLES.map((row) => (
                    <tr key={row.sak} className="border-t border-border/40">
                      <td className="num px-4 py-2.5 font-bold text-gold">{fmtNum(row.sak)} SAK</td>
                      <td className="num px-4 py-2.5 font-semibold text-foreground">
                        {fmtNum(row.grams)} {t("_authenticatedSak-gold.k10006")}
                      </td>
                      <td className="num px-4 py-2.5 text-muted-foreground">
                        {sakPriceUsd != null ? fmtUSD(row.sak * sakPriceUsd) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t("_authenticatedSak-gold.k10005")}
              {updatedAt ? t("sakGold.m2", { v: fmtAgo(secondsAgo) }) : ""}.
            </p>
          </div>

          {/* History summary */}
          {historyStats && (
            <div className="card-luxe p-6">
              <h2 className="mb-1 font-bold text-foreground">{t("_authenticatedSak-gold.k8")}</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k9")}</span>
                  <span className="num font-bold text-foreground">{fmtUSD(historyStats.max)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k10")}</span>
                  <span className="num font-bold text-foreground">{fmtUSD(historyStats.min)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k11")}</span>
                  <span className="num font-bold text-gold">{fmtUSD(historyStats.last)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("_authenticatedSak-gold.k12")}</span>
                  <span
                    className={`num font-bold ${historyStats.changePct >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {historyStats.changePct >= 0 ? "+" : ""}
                    {fmtNum(historyStats.changePct, 2)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quote metadata footer */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border/60 bg-secondary/40 px-5 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5 text-gold" />
          {t("_authenticatedSak-gold.k10007")}{" "}
          <span className="font-bold text-foreground">{sourceLabel(source)}</span>
        </span>
        <span>
          {t("_authenticatedSak-gold.k10008")}{" "}
          <span className="num font-bold text-foreground">{fmtAgo(secondsAgo)}</span>
        </span>
        {gold?.fetchedAt && (
          <span>
            {t("_authenticatedSak-gold.k10009")}{" "}
            <span className="num text-foreground/80">{fmtDate(gold.fetchedAt)}</span>
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 font-bold ${
            isStale ? "bg-amber-500/15 text-amber-400" : "bg-success/15 text-success"
          }`}
        >
          {isStale ? t("_authenticatedSak-gold.k32") : t("_authenticatedSak-gold.k33")}
        </span>
      </div>
    </PortalShell>
  );
}
