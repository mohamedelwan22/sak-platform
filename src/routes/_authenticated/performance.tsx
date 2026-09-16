import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Wallet,
  Coins,
  TrendingUp,
  Landmark,
  Clock,
  Award,
  Percent,
  Layers,
  Building2,
  Activity,
  Store,
} from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtDate, fmtNum } from "@/lib/format";
import { performanceApi, type PerformanceReport } from "@/api/performance.api";

export const Route = createFileRoute("/_authenticated/performance")({
  component: PerformancePage,
});

const GOLD = "#C9A84C";

function money(value: string | null | undefined, decimals = 2): number {
  if (value == null) return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function pnlClass(value: string | null | undefined): string {
  const n = money(value);
  if (!Number.isFinite(n)) return "text-muted-foreground";
  if (n > 0) return "text-success";
  if (n < 0) return "text-destructive";
  return "text-foreground";
}

function PerformancePage() {
  const { session } = useSession();
  const userId = session?.user.id;

  const { data, isLoading, isError, refetch } = useQuery<PerformanceReport>({
    queryKey: ["performance-report", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await performanceApi.getReport();
      return res.data.data;
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.performanceHistory.map((p) => ({
      date: p.date,
      label: fmtDate(p.date),
      value: money(p.portfolioValueUsd),
      investedSak: money(p.investedSak, 4),
      sakPrice: money(p.sakPriceUsd),
    }));
  }, [data]);

  const showChart = data != null && !data.historyInsufficient && chartData.length >= 2;

  const summary = data?.summary;

  return (
    <PortalShell title="الأداء والعوائد">
      {isLoading ? (
        <Spinner />
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
          <Activity className="h-9 w-9 text-muted-foreground/60" />
          <div>
            <p className="font-semibold text-foreground">تعذّر تحميل بيانات الأداء</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              حاول مرة أخرى بعد قليل، وإذا استمرت المشكلة تواصل مع الدعم.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-gold-gradient px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="قيمة المحفظة الحالية"
              value={summary?.currentValueUsd != null ? fmtUSD(summary.currentValueUsd) : "—"}
              subtitle={`سعر SAK: ${summary?.sakPriceUsd != null ? fmtUSD(summary.sakPriceUsd) : "—"}`}
              icon={Wallet}
              variant="gold"
            />
            <StatsCard
              title="إجمالي الاستثمار"
              value={fmtUSD(summary?.investedUsd)}
              icon={Coins}
              variant="info"
            />
            <StatsCard
              title="الأرباح غير المحققة"
              value={summary?.unrealizedPnlUsd != null ? fmtUSD(summary.unrealizedPnlUsd) : "—"}
              icon={TrendingUp}
              variant="default"
              subtitle={
                summary?.unrealizedPnlUsd != null
                  ? money(summary.unrealizedPnlUsd) > 0
                    ? "مكسب غير محقق"
                    : money(summary.unrealizedPnlUsd) < 0
                      ? "خسارة غير محققة"
                      : "بالتعادل حالياً"
                  : undefined
              }
            />
            <StatsCard
              title="الأرباح المحققة"
              value={fmtUSD(summary?.realizedProfitUsd)}
              icon={Landmark}
              variant="success"
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="أرباح قيد التنفيذ"
              value={fmtUSD(summary?.pendingPayoutUsd)}
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="الأرباح الإجمالية"
              value={summary?.totalProfitUsd != null ? fmtUSD(summary.totalProfitUsd) : "—"}
              subtitle={`غير محققة + محققة`}
              icon={Award}
              variant="success"
            />
            <StatsCard
              title="العائد على الاستثمار"
              value={
                summary?.roiPercent != null ? `${Number(summary.roiPercent).toFixed(2)}%` : "—"
              }
              icon={Percent}
              variant="gold"
              subtitle={
                summary?.roiPercent != null
                  ? `محسوب من ${fmtUSD(summary.investedUsd)} مستثمرة`
                  : undefined
              }
            />
            <StatsCard
              title="إجمالي SAK المملوك"
              value={fmtSAK(summary?.totalSakOwned, 4)}
              subtitle={`${fmtNum(summary?.activeHoldings)} استثمار نشط · ${fmtNum(summary?.maturedHoldings)} مستحق`}
              icon={Layers}
              variant="info"
            />
          </div>

          {/* Chart */}
          <section className="card-luxe p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-foreground">أداء المحفظة عبر الزمن</h2>
                <p className="text-xs text-muted-foreground">
                  التقييم مبني على نقاط سعر الذهب الفعلية وقت كل فترة
                  {summary?.valuationDate != null
                    ? ` · آخر تقييم ${fmtDate(summary.valuationDate)}`
                    : ""}
                </p>
              </div>
              <Activity className="h-5 w-5 shrink-0 text-gold" />
            </div>

            {data.historyInsufficient || chartData.length < 2 ? (
              <EmptyState
                icon={Activity}
                title="لا توجد بيانات تاريخية كافية بعد"
                description={
                  chartData.length === 1
                    ? "نقطة تقييم واحدة فقط حتى الآن — يبدأ الرسم البياني عند توفر نقطتين أو أكثر."
                    : "عندما تتراكم نقاط تقييم السعر عبر الوقت، سيرسم هنا أداء محفظتك."
                }
              />
            ) : showChart ? (
              <div dir="rtl" className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <defs>
                      <linearGradient id="performanceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="label"
                      reversed
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                      domain={["auto", "auto"]}
                      width={48}
                      tickFormatter={(v: number) => fmtNum(v)}
                    />
                    <Tooltip
                      formatter={(value: number | string, name: string) => {
                        if (name === "value") return [fmtUSD(Number(value)), "قيمة المحفظة"];
                        return [String(value), name];
                      }}
                      labelFormatter={(label) => {
                        const point = chartData.find((c) => c.label === label);
                        return point ? `التاريخ: ${point.label}` : String(label);
                      }}
                      contentStyle={{
                        backgroundColor: "#0A0E1A",
                        border: "1px solid rgba(201,168,76,0.35)",
                        borderRadius: 12,
                        direction: "rtl",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={GOLD}
                      strokeWidth={2}
                      fill="url(#performanceFill)"
                      dot={{ r: 3, fill: GOLD, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </section>

          {/* Realized by period */}
          <section className="card-luxe p-6">
            <div className="mb-4">
              <h2 className="font-bold text-foreground">العوائد المحققة حسب الفترة</h2>
              <p className="text-xs text-muted-foreground">التوزيعات المكتملة فقط</p>
            </div>
            {!data.realizedByPeriod?.length ? (
              <EmptyState
                icon={Landmark}
                title="لا توجد عوائد محققة بعد"
                description="المبلغ المحقق يظهر هنا فور اكتمال التوزيعات على استثماراتك."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-right">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        فترة التوزيع
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                        العائد المحقق (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.realizedByPeriod.map((r) => (
                      <tr
                        key={`${r.periodStart}-${r.periodEnd}`}
                        className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {fmtDate(r.periodStart)} — {fmtDate(r.periodEnd)}
                        </td>
                        <td className="num px-4 py-3 font-medium text-gold">
                          {fmtUSD(r.payoutUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Returns history */}
          <section className="card-luxe p-6">
            <div className="mb-4">
              <h2 className="font-bold text-foreground">تاريخ العوائد</h2>
              <p className="text-xs text-muted-foreground">
                سجل تدقيق التوزيعات المكتملة على استثماراتك
              </p>
            </div>
            {!data.returnsHistory?.length ? (
              <EmptyState
                icon={Award}
                title="لا يوجد سجل عوائد بعد"
                description="فور استحقاق توزيعات مكتملة، ستجدها هنا مدعومة بفترة التوزيع والعقار."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-right">
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        العقار
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        الفترة
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        الملكية
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        العائد (USD)
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        العائد (SAK)
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.returnsHistory.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-5 py-3.5 font-semibold text-foreground">
                          {r.landTitleAr ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {fmtDate(r.periodStart)} — {fmtDate(r.periodEnd)}
                        </td>
                        <td className="num px-5 py-3.5">
                          {money(r.ownershipPercent, 2).toFixed(2)}%
                        </td>
                        <td className="num px-5 py-3.5 font-medium text-gold">
                          {fmtUSD(r.payoutUsd)}
                        </td>
                        <td className="num px-5 py-3.5">{r.payoutSak}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{fmtDate(r.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Breakdown */}
          <section className="card-luxe p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-foreground">تفصيل الأداء حسب الأصل</h2>
                <p className="text-xs text-muted-foreground">
                  قيمة استثمارك داخل كل أرض مرتبطة بمشروعها
                </p>
              </div>
              <span className="num text-sm text-muted-foreground">
                الإجمالي:{" "}
                <span className="font-bold text-gold">
                  {fmtSAK(data.breakdown.totalSakOwned, 4)}
                </span>
              </span>
            </div>
            {!data.breakdown.assets?.length ? (
              <EmptyState
                icon={Building2}
                title="لا توجد أصول بعد"
                description="عندما تشتري SAK في السوق، يظهر هنا تفصيل أداء كل أصل على حدة."
                action={
                  <Link
                    to="/marketplace"
                    className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      تصفح السوق
                    </span>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-right">
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        الأصل / المشروع
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">SAK</th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        استثمارك
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        القيمة الحالية
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        أرباح غير محققة
                      </th>
                      <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                        أرباح محققة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.assets.map((a) => (
                      <tr
                        key={a.landId}
                        className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-foreground">{a.titleAr}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.projectTitleAr ?? ""}
                          </div>
                        </td>
                        <td className="num px-5 py-3.5">{fmtSAK(a.sakOwned, 4)}</td>
                        <td className="num px-5 py-3.5">{fmtUSD(a.investedUsd)}</td>
                        <td className="num px-5 py-3.5">
                          {a.currentValueUsd != null ? fmtUSD(a.currentValueUsd) : "—"}
                        </td>
                        <td className={`num px-5 py-3.5 ${pnlClass(a.unrealizedPnlUsd)}`}>
                          {a.unrealizedPnlUsd != null ? fmtUSD(a.unrealizedPnlUsd) : "—"}
                        </td>
                        <td className="num px-5 py-3.5 font-medium text-gold">
                          {fmtUSD(a.realizedUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}
