import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Lock, Wallet as WalletIcon, TrendingUp, ArrowLeftRight } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, Spinner, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useWallet } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtNum, fmtDateTime } from "@/lib/format";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { holdingsApi } from "@/api/holdings.api";
import { profileApi } from "@/api/profile.api";
import { txLabel } from "@/routes/_authenticated/dashboard";

export const Route = createFileRoute("/_authenticated/sak-balance")({
  component: SakBalancePage,
});

function SakBalancePage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: wallet } = useWallet(userId);
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);

  const { data: realAssets } = useQuery({
    queryKey: ["real-assets-balance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await holdingsApi.getRealAssets();
      return res.data.data;
    },
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["transactions-balance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.transactions();
      return res.data.data;
    },
  });

  const balance = wallet ? Number(wallet.sak_balance) : null;
  const frozen = wallet ? Number(wallet.frozen_balance ?? wallet.frozenBalance ?? 0) : null;
  const available = balance != null && frozen != null ? balance - frozen : null;
  const investedSak = realAssets ? Number(realAssets.totalSakOwned ?? 0) : null;
  const balanceUsd = balance != null && price != null ? balance * price : null;
  const availableUsd = available != null && price != null ? available * price : null;
  const frozenUsd = frozen != null && price != null ? frozen * price : null;
  const investedUsd = investedSak != null && price != null ? investedSak * price : null;

  const totalSpread = balance != null ? Math.max(1, balance) : 1;
  const availablePct = available != null ? Math.min(100, (available / totalSpread) * 100) : 0;
  const frozenPct = frozen != null ? Math.min(100, (frozen / totalSpread) * 100) : 0;

  const recent = Array.isArray(transactions)
    ? (
        transactions as Array<{
          id: string;
          type: string;
          direction: string;
          sak_amount: string | number;
          usd_amount: string | number | null;
          created_at: string;
          status: string;
        }>
      ).slice(0, 8)
    : [];

  return (
    <PortalShell title="رصيد SAK">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="رصيد SAK الإجمالي"
          value={balance != null ? fmtSAK(balance, 2) : "…"}
          subtitle={balanceUsd != null ? `≈ ${fmtUSD(balanceUsd)}` : undefined}
          icon={WalletIcon}
          variant="gold"
        />
        <StatsCard
          title="الرصيد المتاح"
          value={available != null ? fmtSAK(available, 2) : "…"}
          subtitle={availableUsd != null ? `≈ ${fmtUSD(availableUsd)}` : undefined}
          icon={Landmark}
          variant="success"
        />
        <StatsCard
          title="الرصيد المحجوز"
          value={frozen != null && frozen > 0 ? fmtSAK(frozen, 2) : "0 SAK"}
          subtitle={
            frozenUsd != null && frozen != null && frozen > 0
              ? `≈ ${fmtUSD(frozenUsd)}`
              : "لا يوجد حجز"
          }
          icon={Lock}
          variant={frozen != null && frozen > 0 ? "warning" : "default"}
        />
        <StatsCard
          title="المستثمر في الأصول"
          value={investedSak != null ? fmtSAK(investedSak, 2) : "…"}
          subtitle={investedUsd != null ? `≈ ${fmtUSD(investedUsd)}` : undefined}
          icon={TrendingUp}
          variant="info"
        />
      </div>

      {wallet && balance != null && frozen != null && (
        <div className="card-luxe mt-6 p-6">
          <h2 className="mb-4 font-bold text-foreground">توزيع الرصيد</h2>
          <div className="mb-2 flex h-4 overflow-hidden rounded-full bg-secondary">
            {availablePct > 0 && (
              <div className="h-full bg-gold" style={{ width: `${availablePct}%` }} />
            )}
            {frozenPct > 0 && (
              <div className="h-full bg-warning" style={{ width: `${frozenPct}%` }} />
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-gold" />
              متاح: <span className="num font-bold text-foreground">{fmtSAK(available, 2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-warning" />
              محجوز: <span className="num font-bold text-foreground">{fmtSAK(frozen, 2)}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/wallet"
              className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              إيداع / سحب
            </Link>
            <Link
              to="/convert"
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-bold text-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" /> تحويل إلى SAK
            </Link>
          </div>
        </div>
      )}

      <div className="card-luxe mt-6 overflow-x-auto !p-0">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-bold text-foreground">آخر حركات SAK</h2>
          <Link to="/transactions" className="text-xs font-bold text-gold hover:underline">
            عرض الكل
          </Link>
        </div>
        {txLoading ? (
          <Spinner />
        ) : !recent.length ? (
          <EmptyState
            icon={Landmark}
            title="لا توجد حركات بعد"
            description="تظهر هنا آخر الحركات على رصيدك من SAK."
          />
        ) : (
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">النوع</th>
                <th className="px-5 py-3.5 font-semibold">الكمية</th>
                <th className="px-5 py-3.5 font-semibold">القيمة (USD)</th>
                <th className="px-5 py-3.5 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                >
                  <td className="px-5 py-3.5 font-semibold text-foreground">{txLabel(t.type)}</td>
                  <td
                    className={`num px-5 py-3.5 font-bold ${t.direction === "credit" ? "text-success" : "text-destructive"}`}
                  >
                    {t.direction === "credit" ? "+" : "−"}
                    {fmtNum(Number(t.sak_amount), 2)}
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">
                    {t.usd_amount != null ? fmtUSD(t.usd_amount) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {fmtDateTime(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalShell>
  );
}
