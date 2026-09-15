import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Coins, Flame, Scale, Percent, Info } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, Spinner, EmptyState } from "@/components/shared/ui-kit";
import { goldQuery, configQuery, goldHistoryQuery, sakPriceQuery } from "@/lib/queries";
import { fmtUSD, fmtNum, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sak-gold")({
  component: SakGoldPage,
});

interface GoldHistoryItem {
  id: string;
  gramPriceUsd: number | string;
  source: string;
  createdAt: string;
}

const PERIODS: Array<{ key: string; label: string }> = [
  { key: "7d", label: "7 أيام" },
  { key: "30d", label: "30 يوماً" },
  { key: "all", label: "الكل" },
];

const SOURCE_LABELS: Record<string, string> = {
  seed: "بيانات أساسية",
  manual: "تحديث يدوي",
  qa_setup: "بيانات تجريبية",
  "qa-setup": "بيانات تجريبية",
};

function SakGoldPage() {
  const [period, setPeriod] = useState<string>("30d");

  const { data: gold, isLoading: goldLoading } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const { data: priceInfo, isLoading: priceLoading } = useQuery(sakPriceQuery);
  const { data: history, isLoading: historyLoading } = useQuery(goldHistoryQuery(period));

  const gramPrice = gold?.gram_price_usd ?? priceInfo?.gram_price_usd ?? null;
  const sakPriceUsd = priceInfo?.sak_price_usd ?? null;
  const ratio = priceInfo?.sak_to_gold_ratio ?? config?.sak_to_gold_ratio ?? null;
  const sellFee = priceInfo?.sell_fee_percent ?? config?.sell_fee_percent ?? null;
  const goldUpdatedAt = priceInfo?.gold_updated_at ?? gold?.created_at ?? null;

  const [gramInput, setGramInput] = useState<string>("");

  const chartData = useMemo(() => {
    const items: GoldHistoryItem[] = Array.isArray(history?.data)
      ? history.data
      : Array.isArray(history)
        ? (history as unknown as GoldHistoryItem[])
        : [];
    const sorted = [...items].sort((a, b) =>
      String(a.createdAt).localeCompare(String(b.createdAt)),
    );
    return sorted.map((h) => ({
      date: fmtDate(h.createdAt),
      price: Number(h.gramPriceUsd),
    }));
  }, [history]);

  const historyStats = useMemo(() => {
    if (!chartData.length) return null;
    const prices = chartData.map((c) => c.price);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, last, changePct };
  }, [chartData]);

  const sakPerGram = ratio && Number(ratio) > 0 ? 1 / Number(ratio) : null;
  const gramsPerSak = ratio ? Number(ratio) : null;
  const [unit, setUnit] = useState<"gram" | "sak">("gram");
  const amount = gramInput !== "" ? Number(gramInput) : null;
  const gramValue =
    unit === "gram" ? amount : amount != null && gramsPerSak != null ? amount * gramsPerSak : null;
  const sakValue =
    unit === "sak" ? amount : amount != null && sakPerGram != null ? amount * sakPerGram : null;
  const usdValue = gramValue != null && gramPrice != null ? gramValue * Number(gramPrice) : null;

  return (
    <PortalShell title="SAK والذهب">
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-foreground/90">
          SAK عملة رقمية مرتبطة بالذهب: كل وحدة SAK تساوي{" "}
          <span className="num font-bold text-gold">
            {gramsPerSak != null ? fmtNum(gramsPerSak, 4) : "—"} جرام ذهب
          </span>
          . السعر تحدده بيانات سعر الذهب الرسمية المحسّنة في المنصة، ورسوم البيع في السوق{" "}
          <span className="num font-bold text-gold">
            {sellFee != null ? `${fmtNum(sellFee, 2)}%` : "—"}
          </span>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="سعر جرام الذهب"
          value={gramPrice != null ? fmtUSD(gramPrice) : "…"}
          subtitle={goldUpdatedAt ? `آخر تحديث: ${fmtDate(goldUpdatedAt)}` : undefined}
          icon={Flame}
          variant="gold"
          isLoading={goldLoading}
        />
        <StatsCard
          title="سعر SAK"
          value={sakPriceUsd != null ? fmtUSD(sakPriceUsd) : "…"}
          subtitle={gramsPerSak != null ? `= ${fmtNum(gramsPerSak, 4)} جرام` : undefined}
          icon={Coins}
          variant="info"
          isLoading={priceLoading}
        />
        <StatsCard
          title="نسبة الربط"
          value={ratio != null ? fmtNum(ratio, 4) : "…"}
          subtitle="جرام ذهب لكل SAK"
          icon={Scale}
          variant="success"
        />
        <StatsCard
          title="رسوم البيع"
          value={sellFee != null ? `${fmtNum(sellFee, 2)}%` : "…"}
          subtitle="في السوق الثانوي"
          icon={Percent}
          variant="warning"
        />
      </div>

      {historyStats && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card-luxe p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-foreground">سجل سعر الذهب</h2>
                <p className="text-xs text-muted-foreground">
                  بيانات مخزنة بشكل مرفّق عبر تاريخ المنصة
                </p>
              </div>
              <div className="flex rounded-lg bg-secondary p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriod(p.key)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                      period === p.key
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
                      formatter={(value: number | string) => [fmtUSD(Number(value)), "سعر الذهب"]}
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
            ) : chartData.length === 1 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                نقطة واحدة فقط حتى الآن — سجل التاريخ يظهر عند توفر المزيد من التحديثات.
              </p>
            ) : (
              <EmptyState
                icon={Flame}
                title="لا يوجد سجل أسعار بعد"
                description="يُضاف سجل الذهب تلقائياً عند توفر تحديثات الأسعار."
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="card-luxe p-6">
              <h2 className="mb-1 font-bold text-foreground">ملخص السجل</h2>
              {historyStats ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الأعلى</span>
                    <span className="num font-bold text-foreground">
                      {fmtUSD(historyStats.max)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الأدنى</span>
                    <span className="num font-bold text-foreground">
                      {fmtUSD(historyStats.min)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">السعر الحالي</span>
                    <span className="num font-bold text-gold">{fmtUSD(historyStats.last)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التغير خلال الفترة</span>
                    <span
                      className={`num font-bold ${historyStats.changePct >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {historyStats.changePct >= 0 ? "+" : ""}
                      {fmtNum(historyStats.changePct, 2)}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">لا توجد بيانات إحصائية بعد.</p>
              )}
            </div>

            <div className="card-luxe p-6">
              <h2 className="mb-4 font-bold text-foreground">حاسبة الربط</h2>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                أدخل الكمية
              </label>
              <div className="mb-3 flex items-center gap-2">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as "gram" | "sak")}
                  className="rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                >
                  <option value="gram">جرام ذهب</option>
                  <option value="sak">SAK</option>
                </select>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={gramInput}
                  onChange={(e) => setGramInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                />
              </div>
              {amount != null && amount > 0 && (
                <div className="mt-4 space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">تساوي SAK</span>
                    <span className="num font-bold text-gold">
                      {sakValue != null ? fmtNum(sakValue, 4) : "—"} SAK
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">تعادل ذهباً</span>
                    <span className="num font-bold text-foreground">
                      {gramValue != null ? fmtNum(gramValue, 4) : "—"} جرام
                    </span>
                  </p>
                  <p className="flex justify-between border-t border-border/60 pt-2">
                    <span className="text-muted-foreground">القيمة بالدولار</span>
                    <span className="num font-bold text-foreground">
                      {usdValue != null ? fmtUSD(usdValue) : "—"}
                    </span>
                  </p>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                الحاسبة أعلاه توضيحية للأغراض التعليمية وتستخدم نسبة الربط الرسمية
                {sakPerGram != null ? ` (${fmtNum(Number(ratio), 4)} جرام لكل SAK)` : ""}. عمليات
                السوق الفعلية تتم عبر صفحة السوق.
              </p>
            </div>
          </div>
        </div>
      )}

      {!historyStats && (
        <div className="mt-6">
          <EmptyState
            icon={Flame}
            title="لا يوجد سجل أسعار بعد"
            description="سيظهر هنا سجل أسعار الذهب ونسبة الربط عند توفر البيانات."
          />
        </div>
      )}
    </PortalShell>
  );
}
