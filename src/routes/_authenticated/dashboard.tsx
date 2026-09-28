import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, Briefcase, TrendingUp, Coins } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { GoldTicker } from "@/components/GoldTicker";
import { StatsCard, StatusBadge, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtSAK, fmtDate, fmtNum, daysUntil } from "@/lib/format";
import { profileApi } from "@/api/profile.api";
import { investmentRequestsApi } from "@/api/phase04.api";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: wallet } = useWallet(userId);
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);

  const { data: holdings } = useQuery({
    queryKey: ["holdings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.holdings();
      return res.data.data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.transactions();
      return res.data.data;
    },
  });

  // Task 6: distinguish pending investment REQUESTS from owned holdings in the empty state.
  const { data: requestStats } = useQuery({
    queryKey: ["investment-request-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await investmentRequestsApi.stats();
      return res.data.data as { pending?: number; active?: number } | undefined;
    },
  });
  const pendingRequests = Number(requestStats?.pending ?? 0) || 0;

  const investedSak = (holdings ?? []).reduce(
    (s: number, h: { sak_owned: string | number }) => s + (Number(h.sak_owned) || 0),
    0,
  );
  const portfolioUsd = price != null ? investedSak * price : null;
  const balanceUsd = price != null && wallet ? Number(wallet.sak_balance) * price : null;

  const chartData = useMemo(() => {
    if (!transactions?.length || price == null) return [];
    const sorted = [...transactions].sort((a: { created_at: string }, b: { created_at: string }) =>
      a.created_at.localeCompare(b.created_at),
    );
    let cum = 0;
    return sorted.map(
      (t: { direction: string; sak_amount: string | number; created_at: string }) => {
        cum += (t.direction === "credit" ? 1 : -1) * Number(t.sak_amount);
        return { date: fmtDate(t.created_at), value: Math.max(0, cum * price) };
      },
    );
  }, [transactions, price]);

  return (
    <PortalShell title={t("_authenticatedDashboard.k5")}>
      <section className="card-luxe relative mb-6 overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          {t("dashboard.eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("dashboard.welcome", {
            name: (profile?.firstName ?? "").trim() || t("dashboard.welcomeFallback"),
          })}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </section>

      {profile && profile.kyc_status !== "approved" && (
        <Link
          to="/kyc"
          className="mb-6 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm"
        >
          <span className="font-semibold text-warning">
            {profile.kyc_status === "pending"
              ? t("_authenticatedDashboard.k16")
              : t("_authenticatedDashboard.k17")}
          </span>
          <span className="font-bold text-warning">←</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedDashboard.k6")}
          value={portfolioUsd != null ? fmtUSD(portfolioUsd) : "…"}
          subtitle={t("_authenticatedDashboard.k7")}
          icon={TrendingUp}
          variant="gold"
        />
        <StatsCard
          title={t("_authenticatedDashboard.k8")}
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          subtitle={balanceUsd != null ? `≈ ${fmtUSD(balanceUsd)}` : undefined}
          icon={Wallet}
          variant="info"
        />
        <StatsCard
          title={t("_authenticatedDashboard.k9")}
          value={fmtNum(investedSak, 2)}
          subtitle={t("dashboard.m1", { v: holdings?.length ?? 0 })}
          icon={Briefcase}
          variant="success"
        />
        <StatsCard
          title={t("_authenticatedDashboard.k10")}
          value={price != null ? fmtUSD(price) : "…"}
          subtitle={config ? t("dashboard.m2", { v: Number(config.sak_to_gold_ratio) }) : undefined}
          icon={Coins}
          variant="gold"
        />
      </div>

      <div className="mt-6">
        <GoldTicker />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-luxe p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedDashboard.k1")}</h2>
          {chartData.length > 1 ? (
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                    formatter={(v: number) => [fmtUSD(v), t("_authenticatedDashboard.k18")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    fill="url(#goldFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title={t("_authenticatedDashboard.k11")}
              description={t("_authenticatedDashboard.k12")}
            />
          )}
        </div>

        <div className="card-luxe p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">{t("_authenticatedDashboard.k2")}</h2>
            <Link to="/transactions" className="text-xs font-semibold text-gold hover:underline">
              {t("_authenticatedDashboard.k10000")}
            </Link>
          </div>
          {transactions?.length ? (
            <ul className="space-y-3">
              {transactions
                .slice(0, 6)
                .map(
                  (t: {
                    id: string;
                    type: string;
                    created_at: string;
                    direction: string;
                    sak_amount: string | number;
                  }) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{txLabel(t.type)}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</p>
                      </div>
                      <span
                        className={`num font-bold ${t.direction === "credit" ? "text-success" : "text-destructive"}`}
                      >
                        {t.direction === "credit" ? "+" : "−"}
                        {fmtNum(Number(t.sak_amount), 2)}
                      </span>
                    </li>
                  ),
                )}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("_authenticatedDashboard.k3")}
            </p>
          )}
        </div>
      </div>

      <div className="card-luxe mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">{t("_authenticatedDashboard.k4")}</h2>
          <Link to="/portfolio" className="text-xs font-semibold text-gold hover:underline">
            {t("_authenticatedDashboard.k10001")}
          </Link>
        </div>
        {holdings?.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {holdings
              .slice(0, 3)
              .map(
                (h: {
                  id: string;
                  sak_owned: string | number;
                  status: string;
                  maturity_date: string;
                  land?: { title_ar?: string } | null;
                }) => {
                  const sakOwned = Number(h.sak_owned) || 0;
                  const currentValue = price != null ? sakOwned * price : null;
                  const days = daysUntil(h.maturity_date);
                  const matured = h.maturity_date ? new Date(h.maturity_date) <= new Date() : false;
                  const landTitle = h.land?.title_ar ?? t("_authenticatedDashboard.k19");
                  return (
                    <div key={h.id} className="rounded-xl border border-border bg-secondary/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className="num font-bold text-foreground">
                          {fmtNum(sakOwned, 2)} SAK
                        </span>
                        <StatusBadge
                          status={matured && h.status === "active" ? "matured" : h.status}
                        />
                      </div>
                      <p className="mt-1 text-sm font-semibold text-foreground">{landTitle}</p>
                      {currentValue != null && (
                        <p className="mt-1 text-xs text-gold">≈ {fmtUSD(currentValue)}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("_authenticatedDashboard.k10000")} {fmtDate(h.maturity_date)}
                        {!matured && days > 0 ? t("dashboard.m3", { v: days }) : ""}
                      </p>
                    </div>
                  );
                },
              )}
          </div>
        ) : pendingRequests > 0 ? (
          <EmptyState
            title={t("_authenticatedDashboard.k13")}
            description={t("dashboard.m4", { v: pendingRequests })}
            action={
              <Link
                to="/investment-requests"
                className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                {t("_authenticatedDashboard.k10002")}
              </Link>
            }
          />
        ) : (
          <EmptyState
            title={t("_authenticatedDashboard.k14")}
            description={t("_authenticatedDashboard.k15")}
            action={
              <Link
                to="/projects"
                className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                {t("_authenticatedDashboard.k10003")}
              </Link>
            }
          />
        )}
      </div>
    </PortalShell>
  );
}

export function txLabel(type: string): string {
  const map: Record<string, string> = {
    deposit: t("_authenticatedDashboard.k20"),
    withdrawal: t("_authenticatedDashboard.k21"),
    buy_sak: t("_authenticatedDashboard.k22"),
    sell_sak: t("_authenticatedDashboard.k23"),
    buy: t("_authenticatedDashboard.k24"),
    sell: t("_authenticatedDashboard.k25"),
    profit_distribution: t("_authenticatedDashboard.k26"),
    affiliate_commission: t("_authenticatedDashboard.k27"),
    fee: t("_authenticatedDashboard.k28"),
    refund: t("_authenticatedDashboard.k29"),
  };
  return map[type] ?? type;
}
