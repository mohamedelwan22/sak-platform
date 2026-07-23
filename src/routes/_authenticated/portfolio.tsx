import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, TrendingUp, Coins, BarChart3 } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtNum, fmtDate, daysUntil } from "@/lib/format";
import { landImage } from "@/lib/images";
import { profileApi } from "@/api/profile.api";
import { apiClient } from "@/api/client";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);

  const { data: holdings, isLoading } = useQuery({
    queryKey: ["holdings-full", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.holdings();
      return res.data.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["portfolio-summary", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiClient.get("/holdings/portfolio-summary");
      return res.data.data;
    },
  });

  const totalInvested = summary?.totalInvestedUsd ?? summary?.total_invested_usd ?? null;
  const currentValueTotal = summary?.currentValueUsd ?? summary?.current_value_usd ?? null;
  const pnlTotal = summary?.totalProfitUsd ?? summary?.pnl_usd ?? null;
  const profitPct = summary?.profitPercent ?? summary?.profit_percentage ?? null;

  const allocationColors = [
    "bg-gold",
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-cyan-500",
    "bg-teal-500",
  ];

  const allocation = Array.isArray(holdings)
    ? holdings
        .map((h: { sak_owned: string | number; land?: { title_ar?: string } | null }, i: number) => ({
          name: h.land?.title_ar ?? "أصل",
          sak: Number(h.sak_owned) || 0,
          color: allocationColors[i % allocationColors.length],
        }))
        .filter((a: { sak: number }) => a.sak > 0)
    : [];

  const totalSakAllocation = allocation.reduce((s: number, a: { sak: number }) => s + a.sak, 0);

  return (
    <PortalShell title="استثماراتي">
      {isLoading ? (
        <Spinner />
      ) : !Array.isArray(holdings) || !holdings.length ? (
        <EmptyState
          icon={Briefcase}
          title="لا استثمارات بعد"
          description="ابدأ ببناء محفظتك من الأصول الحقيقية"
          action={
            <Link
              to="/projects"
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              تصفح الأصول
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="إجمالي الاستثمار"
              value={totalInvested != null ? fmtUSD(totalInvested) : "…"}
              subtitle="التكلفة الإجمالية"
              icon={Briefcase}
            />
            <StatsCard
              title="القيمة الحالية"
              value={currentValueTotal != null ? fmtUSD(currentValueTotal) : "…"}
              subtitle="حسب سعر الذهب الحالي"
              icon={TrendingUp}
              variant="gold"
            />
            <StatsCard
              title="الربح/الخسارة"
              value={pnlTotal != null ? `${pnlTotal >= 0 ? "+" : ""}${fmtUSD(pnlTotal)}` : "…"}
              subtitle={pnlTotal != null ? (pnlTotal >= 0 ? "ربح" : "خسارة") : undefined}
              icon={Coins}
            />
            <StatsCard
              title="نسبة العائد"
              value={profitPct != null ? `${profitPct >= 0 ? "+" : ""}${Number(profitPct).toFixed(2)}%` : "…"}
              subtitle="العائد على الاستثمار"
              icon={BarChart3}
            />
          </div>

          {allocation.length > 1 && (
            <div className="card-luxe mt-6 p-6">
              <h2 className="mb-4 font-bold text-foreground">توزيع الأصول</h2>
              <div className="mb-3 h-4 flex overflow-hidden rounded-full">
                {allocation.map((a: { name: string; sak: number; color: string }, i: number) => (
                  <div
                    key={i}
                    className={a.color}
                    style={{ width: `${(a.sak / totalSakAllocation) * 100}%` }}
                    title={`${a.name}: ${fmtNum(a.sak, 2)} SAK`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {allocation.map((a: { name: string; sak: number; color: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full ${a.color}`} />
                    <span>{a.name}</span>
                    <span className="num font-semibold text-foreground">
                      {fmtNum((a.sak / totalSakAllocation) * 100, 1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-5 mt-6 md:grid-cols-2 xl:grid-cols-3">
            {holdings.map(
              (h: {
                id: string;
                sak_owned: string | number;
                status: string;
                maturity_date: string;
                purchase_price_per_sak_usd: string | number;
                purchase_date: string;
                land?: {
                  title_ar?: string;
                  country?: string;
                  city?: string;
                  cover_image_url?: string;
                } | null;
              }) => {
                const sakOwned = Number(h.sak_owned) || 0;
                const purchasePrice = Number(h.purchase_price_per_sak_usd) || 0;
                const matured = h.maturity_date ? new Date(h.maturity_date) <= new Date() : false;
                const days = daysUntil(h.maturity_date);
                const currentValue = price != null ? sakOwned * price : null;
                const costBasis = sakOwned * purchasePrice;
                const pnl = currentValue != null ? currentValue - costBasis : null;
                const statusColor =
                  h.status === "sold"
                    ? "text-destructive"
                    : matured
                      ? "text-gold"
                      : "text-success";
                return (
                  <div key={h.id} className="card-luxe overflow-hidden !p-0">
                    <div className="relative h-36">
                      <img
                        src={landImage(h.land?.cover_image_url)}
                        alt=""
                        loading="lazy"
                        width={1024}
                        height={683}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-navy-deep/40" />
                      <div className="absolute top-3 right-3">
                        <StatusBadge
                          status={matured && h.status === "active" ? "matured" : h.status}
                        />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-foreground">{h.land?.title_ar ?? "أصل"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {h.land?.city}{h.land?.city && h.land?.country ? "، " : ""}{h.land?.country}
                      </p>
                      <div className="mt-4 space-y-2 text-sm">
                        <Row label="الوحدات" value={`${fmtNum(sakOwned, 2)} SAK`} />
                        <Row
                          label="سعر الشراء / SAK"
                          value={purchasePrice > 0 ? fmtUSD(purchasePrice) : "—"}
                        />
                        <Row
                          label="القيمة الحالية"
                          value={currentValue != null ? fmtUSD(currentValue) : "…"}
                          gold
                        />
                        <Row label="تكلفة الشراء" value={costBasis > 0 ? fmtUSD(costBasis) : "—"} />
                        {pnl != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الربح/الخسارة</span>
                            <span
                              className={`num font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {pnl >= 0 ? "+" : ""}
                              {fmtUSD(pnl)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحالة</span>
                          <span className={`font-semibold ${statusColor}`}>
                            {h.status === "sold"
                              ? "مباع"
                              : matured
                                ? "مستحق"
                                : "نشط"}
                          </span>
                        </div>
                        <Row label="تاريخ الشراء" value={fmtDate(h.purchase_date)} />
                      </div>
                      <div
                        className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold ${matured ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"}`}
                      >
                        {matured
                          ? "استحق — يمكنك طلب البيع قريباً"
                          : `الاستحقاق بعد ${days} يوماً (${fmtDate(h.maturity_date)})`}
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </PortalShell>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-semibold ${gold ? "text-gold" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
