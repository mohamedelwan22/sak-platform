import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, TrendingUp, Coins, BarChart3, Send } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import {
  StatsCard,
  StatusBadge,
  EmptyState,
  Spinner,
  Pagination,
} from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtNum, fmtDate, daysUntil } from "@/lib/format";
import { landImage } from "@/lib/images";
import { profileApi } from "@/api/profile.api";
import { apiClient } from "@/api/client";
import {
  investmentRequestsApi,
  unwrapRows,
  unwrapPagination,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);
  const [reqPage, setReqPage] = useState(1);

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

  const { data: requestsData } = useQuery({
    queryKey: ["my-investment-requests", userId, reqPage],
    enabled: !!userId,
    queryFn: () => investmentRequestsApi.list({ page: reqPage, limit: 10 }),
  });
  const myRequests = unwrapRows(requestsData) as InvestmentRequestRow[];
  const reqPagination = unwrapPagination(requestsData);

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
        .map(
          (h: { sak_owned: string | number; land?: { title_ar?: string } | null }, i: number) => ({
            name: h.land?.title_ar ?? t("_authenticatedPortfolio.k19"),
            sak: Number(h.sak_owned) || 0,
            color: allocationColors[i % allocationColors.length],
          }),
        )
        .filter((a: { sak: number }) => a.sak > 0)
    : [];

  const totalSakAllocation = allocation.reduce((s: number, a: { sak: number }) => s + a.sak, 0);

  return (
    <PortalShell title={t("_authenticatedPortfolio.k4")}>
      {myRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Send className="h-4 w-4 text-gold" /> {t("_authenticatedPortfolio.k10000")}
            </h2>
            <Link to="/investment-requests" className="text-xs font-bold text-gold hover:underline">
              {t("_authenticatedPortfolio.k10000")}
            </Link>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("_authenticatedPortfolio.k10001")}
          </p>
          <div className="space-y-3">
            {myRequests.map((req) => (
              <Link
                key={req.id}
                to="/investment-requests/$id"
                params={{ id: req.id }}
                className="card-luxe flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs font-bold text-gold">#{req.id.slice(0, 8)}</span>
                    <p className="font-semibold">
                      {req.land?.titleAr ?? t("_authenticatedPortfolio.k20")}
                    </p>
                    <StatusBadge status={req.status} />
                    <StatusBadge status={req.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="num font-bold text-foreground">
                      {fmtUSD(Number(req.amountUsd ?? 0))} USD
                    </span>{" "}
                    •{" "}
                    {req.source === "broker" && req.broker
                      ? t("investmentRequestDetail.m1", { v: req.broker.displayName })
                      : t("_authenticatedPortfolio.k21")}
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">{fmtDate(req.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            page={reqPagination?.page ?? reqPage}
            totalPages={reqPagination?.totalPages ?? 1}
            total={reqPagination?.total}
            onPage={setReqPage}
          />
        </div>
      )}
      {isLoading ? (
        <Spinner />
      ) : !Array.isArray(holdings) || !holdings.length ? (
        <EmptyState
          icon={Briefcase}
          title={t("_authenticatedPortfolio.k5")}
          description={t("_authenticatedPortfolio.k6")}
          action={
            <Link
              to="/projects"
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("_authenticatedPortfolio.k10002")}
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title={t("_authenticatedPortfolio.k7")}
              value={totalInvested != null ? fmtUSD(totalInvested) : "…"}
              subtitle={t("_authenticatedPortfolio.k8")}
              icon={Briefcase}
              variant="info"
            />
            <StatsCard
              title={t("_authenticatedPortfolio.k9")}
              value={currentValueTotal != null ? fmtUSD(currentValueTotal) : "…"}
              subtitle={t("_authenticatedPortfolio.k10")}
              icon={TrendingUp}
              variant="gold"
            />
            <StatsCard
              title={t("_authenticatedPortfolio.k11")}
              value={pnlTotal != null ? `${pnlTotal >= 0 ? "+" : ""}${fmtUSD(pnlTotal)}` : "…"}
              subtitle={
                pnlTotal != null
                  ? pnlTotal >= 0
                    ? t("_authenticatedPortfolio.k22")
                    : t("_authenticatedPortfolio.k23")
                  : undefined
              }
              icon={Coins}
              variant={pnlTotal != null ? (pnlTotal >= 0 ? "success" : "danger") : "default"}
            />
            <StatsCard
              title={t("_authenticatedPortfolio.k12")}
              value={
                profitPct != null
                  ? `${profitPct >= 0 ? "+" : ""}${Number(profitPct).toFixed(2)}%`
                  : "…"
              }
              subtitle={t("_authenticatedPortfolio.k13")}
              icon={BarChart3}
              variant={profitPct != null ? (profitPct >= 0 ? "success" : "danger") : "default"}
            />
          </div>

          {allocation.length > 1 && (
            <div className="card-luxe mt-6 p-6">
              <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedPortfolio.k1")}</h2>
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

          <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-4 w-4 text-gold" /> {t("_authenticatedPortfolio.k10001")}
            </h2>
            <Link to="/projects" className="text-xs font-bold text-gold hover:underline">
              {t("_authenticatedPortfolio.k10003")}
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  h.status === "sold" ? "text-destructive" : matured ? "text-gold" : "text-success";
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
                      <div className="absolute top-3 start-3">
                        <StatusBadge
                          status={matured && h.status === "active" ? "matured" : h.status}
                        />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-foreground">
                        {h.land?.title_ar ?? t("_authenticatedPortfolio.k24")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {h.land?.city}
                        {h.land?.city && h.land?.country ? t("_authenticatedPortfolio.k25") : ""}
                        {h.land?.country}
                      </p>
                      <div className="mt-4 space-y-2 text-sm">
                        <Row
                          label={t("_authenticatedPortfolio.k14")}
                          value={`${fmtNum(sakOwned, 2)} SAK`}
                        />
                        <Row
                          label={t("_authenticatedPortfolio.k15")}
                          value={purchasePrice > 0 ? fmtUSD(purchasePrice) : "—"}
                        />
                        <Row
                          label={t("_authenticatedPortfolio.k16")}
                          value={currentValue != null ? fmtUSD(currentValue) : "…"}
                          gold
                        />
                        <Row
                          label={t("_authenticatedPortfolio.k17")}
                          value={costBasis > 0 ? fmtUSD(costBasis) : "—"}
                        />
                        {pnl != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {t("_authenticatedPortfolio.k2")}
                            </span>
                            <span
                              className={`num font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}
                            >
                              {pnl >= 0 ? "+" : ""}
                              {fmtUSD(pnl)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            {t("_authenticatedPortfolio.k3")}
                          </span>
                          <span className={`font-semibold ${statusColor}`}>
                            {h.status === "sold"
                              ? t("_authenticatedPortfolio.k26")
                              : matured
                                ? t("_authenticatedPortfolio.k27")
                                : t("_authenticatedPortfolio.k28")}
                          </span>
                        </div>
                        <Row
                          label={t("_authenticatedPortfolio.k18")}
                          value={fmtDate(h.purchase_date)}
                        />
                      </div>
                      <div
                        className={`mt-4 rounded-xl px-4 py-3 text-center text-sm font-bold ${matured ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground"}`}
                      >
                        {matured
                          ? t("_authenticatedPortfolio.k29")
                          : t("portfolio.m1", { v: days, d: fmtDate(h.maturity_date) })}
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
