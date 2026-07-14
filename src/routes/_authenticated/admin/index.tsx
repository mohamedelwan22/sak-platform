import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, FileCheck2, ArrowDownToLine, ArrowUpFromLine, Landmark, TrendingUp } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard } from "@/components/shared/ui-kit";
import { adminStats } from "@/lib/admin.functions";
import { fmtUSD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsFn = useServerFn(adminStats);
  const { data: stats, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => statsFn() });

  return (
    <PortalShell title="الإدارة — نظرة عامة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="إجمالي المستثمرين" value={stats ? fmtNum(stats.investors) : "…"} icon={Users} isLoading={isLoading} />
        <StatsCard title="الأصول تحت الإدارة (AUM)" value={stats ? fmtUSD(stats.aumUsd) : "…"} icon={TrendingUp} variant="gold" isLoading={isLoading} />
        <StatsCard title="عدد الأصول" value={stats ? fmtNum(stats.lands) : "…"} icon={Landmark} isLoading={isLoading} />
      </div>

      <div className="mt-6 space-y-3">
        {stats && stats.pendingKyc > 0 && (
          <AlertRow color="destructive" label={`${stats.pendingKyc} طلب KYC بانتظار المراجعة`} to="/admin/kyc" icon={FileCheck2} />
        )}
        {stats && stats.pendingDeposits > 0 && (
          <AlertRow color="warning" label={`${stats.pendingDeposits} طلب إيداع معلّق`} to="/admin/deposits" icon={ArrowDownToLine} />
        )}
        {stats && stats.pendingWithdrawals > 0 && (
          <AlertRow color="info" label={`${stats.pendingWithdrawals} طلب سحب معلّق`} to="/admin/withdrawals" icon={ArrowUpFromLine} />
        )}
        {stats && !stats.pendingKyc && !stats.pendingDeposits && !stats.pendingWithdrawals && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm font-semibold text-success">✓ لا توجد طلبات معلّقة — كل شيء تحت السيطرة</p>
        )}
      </div>
    </PortalShell>
  );
}

function AlertRow({ color, label, to, icon: Icon }: { color: "destructive" | "warning" | "info"; label: string; to: "/admin/kyc" | "/admin/deposits" | "/admin/withdrawals"; icon: typeof Users }) {
  const cls = { destructive: "border-destructive/40 bg-destructive/10 text-destructive", warning: "border-warning/40 bg-warning/10 text-warning", info: "border-info/40 bg-info/10 text-info" }[color];
  return (
    <Link to={to} className={`flex items-center justify-between rounded-xl border px-5 py-4 text-sm font-semibold ${cls}`}>
      <span className="flex items-center gap-2">
        <Icon className="h-4.5 w-4.5" />
        {label}
      </span>
      <span>راجع الآن ←</span>
    </Link>
  );
}
