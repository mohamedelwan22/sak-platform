import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Layers, Landmark, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtNum } from "@/lib/format";
import { apiClient } from "@/api/client";
import { holdingsApi } from "@/api/holdings.api";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/asset-allocation")({
  component: AssetAllocationPage,
});

interface AllocationSlice {
  landId: string;
  titleAr: string;
  sakOwned: number;
  percent: number;
}

interface PortfolioSummary {
  totalInvestedUsd: number;
  currentValueUsd: number;
  totalProfitUsd: number;
  profitPercent: number;
  totalSakOwned: number;
  activeHoldings: number;
  maturedHoldings: number;
  assetAllocation: AllocationSlice[];
}

const ALLOCATION_COLORS = [
  "#C9A84C",
  "#10B981",
  "#3B82F6",
  "#A855F7",
  "#F43F5E",
  "#F59E0B",
  "#06B6D4",
  "#14B8A6",
  "#8B5CF6",
  "#F97316",
];

function chartDataFor(slices: { landId: string; titleAr: string; sakOwned: number }[]) {
  if (!slices.length) return [];
  const total = slices.reduce((s, x) => s + (Number(x.sakOwned) || 0), 0);
  if (total <= 0) return [];
  return slices.map((s) => ({
    name: s.titleAr || "أصل",
    value: Number(s.sakOwned) || 0,
  }));
}

function AssetAllocationPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const livePrice = sakPrice(gold, config);

  const { data: summary, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary-allocation", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiClient.get("/holdings/portfolio-summary");
      return res.data.data;
    },
  });

  const { data: realAssets } = useQuery({
    queryKey: ["real-assets-allocation", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await holdingsApi.getRealAssets();
      return res.data.data;
    },
  });

  const price =
    livePrice ?? (realAssets?.sakPriceUsd != null ? Number(realAssets.sakPriceUsd) : null);

  const byProject = useMemo(() => {
    const assets = realAssets?.assets ?? [];
    const map = new Map<string, { name: string; sak: number; value: number }>();
    for (const a of assets) {
      const name = a.project?.titleAr || a.project?.titleEn || "مشروع";
      const cur = map.get(name) ?? { name, sak: 0, value: 0 };
      cur.sak += Number(a.sakOwned) || 0;
      cur.value += a.currentValueUsd != null ? Number(a.currentValueUsd) : 0;
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sak - a.sak);
  }, [realAssets]);

  const byType = useMemo(() => {
    const assets = realAssets?.assets ?? [];
    const typeLabels: Record<string, string> = {
      land: "أرض",
      agricultural: "أرض زراعية",
      residential: "أرض سكنية",
      commercial: "أرض تجارية",
      villa: "فيلا سكنية",
    };
    const map = new Map<string, { name: string; sak: number; value: number }>();
    for (const a of assets) {
      const name = typeLabels[a.assetType] ?? a.assetType;
      const cur = map.get(name) ?? { name, sak: 0, value: 0 };
      cur.sak += Number(a.sakOwned) || 0;
      cur.value += a.currentValueUsd != null ? Number(a.currentValueUsd) : 0;
      map.set(name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sak - a.sak);
  }, [realAssets]);

  const allocations = useMemo(() => summary?.assetAllocation ?? [], [summary]);
  const totalSak = Number(summary?.totalSakOwned ?? realAssets?.totalSakOwned ?? 0);
  const currentValue = summary?.currentValueUsd ?? realAssets?.totalValueUsd ?? null;
  const profitPct = summary?.profitPercent ?? null;

  const chartData = useMemo(() => chartDataFor(allocations), [allocations]);

  return (
    <PortalShell title="توزيع الأصول">
      {isLoading ? (
        <Spinner />
      ) : !allocations.length && !realAssets?.assets?.length ? (
        <EmptyState
          icon={PieIcon}
          title="لا توجد توزيعات أصول بعد"
          description="عندما تشتري SAK في السوق، سترى هنا توزيع استثمارك بين الأصول الحقيقية والمشاريع وأنواع الأصول."
          action={
            <Link
              to="/marketplace"
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              تصفح السوق وابدأ الاستثمار
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="إجمالي SAK"
              value={fmtSAK(totalSak, 2)}
              subtitle="الوحدات الموزعة على الأصول"
              icon={Landmark}
              variant="default"
            />
            <StatsCard
              title="القيمة الحالية"
              value={currentValue != null ? fmtUSD(currentValue) : "…"}
              subtitle={price != null ? `سعر SAK الآن ${fmtUSD(price)}` : "حسب سعر الذهب"}
              icon={TrendingUp}
              variant="gold"
            />
            <StatsCard
              title="عدد الأصول"
              value={fmtNum(allocations.length, 0)}
              subtitle="أصول حقيقية داعمة"
              icon={Layers}
              variant="info"
            />
            <StatsCard
              title="نسبة العائد"
              value={
                profitPct != null ? `${profitPct >= 0 ? "+" : ""}${fmtNum(profitPct, 2)}%` : "…"
              }
              subtitle="العائد على استثمارك"
              icon={PieIcon}
              variant={profitPct != null ? (profitPct >= 0 ? "success" : "danger") : "default"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="card-luxe p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-foreground">التوزيع حسب الأرض</h2>
                <span className="text-xs font-semibold text-gold">محسوب من حيازاتك</span>
              </div>
              {chartData.length > 1 ? (
                <>
                  <div dir="rtl" className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="55%"
                          outerRadius="85%"
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number | string) => `${fmtSAK(Number(value), 2)}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {allocations.map((slice, i) => (
                      <div key={slice.landId} className="flex items-center gap-2 text-xs">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">{slice.titleAr || "أصل"}</span>
                        <span className="num font-bold text-foreground">
                          {fmtNum(slice.percent, 1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {chartData.length === 1
                    ? "استثمارك بالكامل في أصل واحد — التوزيع الكامل على هذا الأصل."
                    : "لا توجد بيانات توزيع."}
                </div>
              )}
            </div>

            <div className="card-luxe p-6">
              <h2 className="mb-4 font-bold text-foreground">الحيازات بالتفصيل</h2>
              {allocations.length ? (
                <ul className="space-y-3">
                  {allocations.map((slice) => {
                    const sliceValue = price != null ? Number(slice.sakOwned) * price : null;
                    return (
                      <li key={slice.landId} className="rounded-xl border border-border/70 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {slice.titleAr || "أصل"}
                          </span>
                          <span className="num text-sm font-bold text-gold">
                            {fmtNum(slice.percent, 1)}%
                          </span>
                        </div>
                        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gold"
                            style={{
                              width: `${Math.min(100, Math.max(0, slice.percent))}%`,
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            الوحدات:{" "}
                            <span className="num font-semibold text-foreground">
                              {fmtSAK(slice.sakOwned, 2)}
                            </span>
                          </span>
                          <span>
                            القيمة:{" "}
                            <span className="num font-semibold text-foreground">
                              {sliceValue != null ? fmtUSD(sliceValue) : "…"}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد حيازات للعرض.</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="card-luxe p-6">
              <h2 className="mb-4 font-bold text-foreground">التوزيع حسب المشروع</h2>
              {byProject.length ? (
                <ul className="divide-y divide-border/70">
                  {byProject.map((p) => {
                    const pct = totalSak > 0 ? ((p.sak / totalSak) * 100).toFixed(1) : "0.0";
                    return (
                      <li key={p.name} className="flex items-center justify-between py-2.5">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        <span className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="num">{fmtSAK(p.sak, 2)}</span>
                          {p.value > 0 && <span className="num">{fmtUSD(p.value)}</span>}
                          <span className="num font-bold text-gold">{pct}%</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  لا تتوفر بيانات المشاريع — لا يتم اختراع بيانات، ستظهر عند توفرها.
                </p>
              )}
            </div>

            <div className="card-luxe p-6">
              <h2 className="mb-4 font-bold text-foreground">التوزيع حسب نوع الأصل</h2>
              {byType.length ? (
                <ul className="divide-y divide-border/70">
                  {byType.map((t) => {
                    const pct = totalSak > 0 ? ((t.sak / totalSak) * 100).toFixed(1) : "0.0";
                    return (
                      <li key={t.name} className="flex items-center justify-between py-2.5">
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                        <span className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="num">{fmtSAK(t.sak, 2)}</span>
                          {t.value > 0 && <span className="num">{fmtUSD(t.value)}</span>}
                          <span className="num font-bold text-gold">{pct}%</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  لا تتوفر بيانات أنواع الأصول — ستظهر عند توفرها.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}
