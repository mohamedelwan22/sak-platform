import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, Briefcase, TrendingUp, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { GoldTicker } from "@/components/GoldTicker";
import { StatsCard, StatusBadge, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtSAK, fmtDate, fmtNum } from "@/lib/format";

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
      const { data, error } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const investedSak = (holdings ?? []).reduce((s, h) => s + Number(h.sak_owned), 0);
  const portfolioUsd = price != null ? investedSak * price : null;
  const balanceUsd = price != null && wallet ? Number(wallet.sak_balance) * price : null;

  const chartData = useMemo(() => {
    if (!transactions?.length || price == null) return [];
    const sorted = [...transactions].sort((a, b) => a.created_at.localeCompare(b.created_at));
    let cum = 0;
    return sorted.map((t) => {
      cum += (t.direction === "credit" ? 1 : -1) * Number(t.sak_amount);
      return { date: fmtDate(t.created_at), value: Math.max(0, cum * price) };
    });
  }, [transactions, price]);

  return (
    <PortalShell title="لوحتي">
      {profile && profile.kyc_status !== "approved" && (
        <Link
          to="/kyc"
          className="mb-6 flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm"
        >
          <span className="font-semibold text-warning">
            {profile.kyc_status === "pending"
              ? "طلب التحقق من الهوية قيد المراجعة"
              : "أكمل التحقق من الهوية (KYC) لتفعيل الإيداع والاستثمار"}
          </span>
          <span className="font-bold text-warning">←</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="قيمة المحفظة"
          value={portfolioUsd != null ? fmtUSD(portfolioUsd) : "…"}
          subtitle="محسوبة لحظياً بسعر الذهب"
          icon={TrendingUp}
          variant="gold"
        />
        <StatsCard
          title="رصيد SAK"
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          subtitle={balanceUsd != null ? `≈ ${fmtUSD(balanceUsd)}` : undefined}
          icon={Wallet}
        />
        <StatsCard
          title="وحدات مستثمرة"
          value={fmtNum(investedSak, 2)}
          subtitle={`${holdings?.length ?? 0} حيازة نشطة`}
          icon={Briefcase}
        />
        <StatsCard
          title="سعر SAK الآن"
          value={price != null ? fmtUSD(price) : "…"}
          subtitle={config ? `= ${Number(config.sak_to_gold_ratio)} جرام ذهب` : undefined}
          icon={Coins}
        />
      </div>

      <div className="mt-6">
        <GoldTicker />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card-luxe p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold text-foreground">نمو المحفظة</h2>
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
                    formatter={(v: number) => [fmtUSD(v), "القيمة"]}
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
              title="لا توجد بيانات بعد"
              description="ستظهر حركة محفظتك هنا بعد أول إيداع أو استثمار"
            />
          )}
        </div>

        <div className="card-luxe p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">آخر المعاملات</h2>
            <Link to="/transactions" className="text-xs font-semibold text-gold hover:underline">
              عرض الكل
            </Link>
          </div>
          {transactions?.length ? (
            <ul className="space-y-3">
              {transactions.slice(0, 6).map((t) => (
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
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">لا معاملات بعد</p>
          )}
        </div>
      </div>

      <div className="card-luxe mt-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">استثماراتي النشطة</h2>
          <Link to="/portfolio" className="text-xs font-semibold text-gold hover:underline">
            التفاصيل
          </Link>
        </div>
        {holdings?.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {holdings.slice(0, 3).map((h) => (
              <div key={h.id} className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="num font-bold text-foreground">
                    {fmtNum(Number(h.sak_owned), 2)} SAK
                  </span>
                  <StatusBadge status={h.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  الاستحقاق: {fmtDate(h.maturity_date)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="لم تستثمر بعد"
            description="تصفح الأصول المتاحة وابدأ أول استثمار لك"
            action={
              <Link
                to="/projects"
                className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                تصفح الأصول
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
    deposit: "إيداع",
    withdrawal: "سحب",
    buy_sak: "شراء SAK",
    sell_sak: "بيع SAK",
    profit_distribution: "توزيع أرباح",
    affiliate_commission: "عمولة إحالة",
    fee: "رسوم",
    refund: "استرداد",
  };
  return map[type] ?? type;
}
