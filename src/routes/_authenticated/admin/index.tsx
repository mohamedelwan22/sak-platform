import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileCheck2,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Wallet,
  BadgeCheck,
  BarChart3,
  Activity,
  Landmark,
  Briefcase,
  Coins,
  UserCheck,
  CreditCard,
  Banknote,
  UserPlus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, Spinner, EmptyState } from "@/components/shared/ui-kit";
import {
  adminStatsExtended,
  adminChartData,
  adminActivity,
  type AdminActivity,
} from "@/lib/admin.functions";
import { fmtUSD, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminStatsExtended(),
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["admin-chart-data"],
    queryFn: () => adminChartData(),
  });

  const { data: activities, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity"],
    queryFn: () => adminActivity(),
  });

  const chartRows = chartData
    ? chartData.months.map((m, i) => ({
        month: m,
        deposits: chartData.deposits[i] ?? 0,
        withdrawals: chartData.withdrawals[i] ?? 0,
        registrations: chartData.registrations[i] ?? 0,
      }))
    : [];

  return (
    <PortalShell title="الإدارة — نظرة عامة">
      {/* Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="إجمالي المستثمرين"
          value={stats ? fmtNum(stats.investors) : "…"}
          icon={Users}
          isLoading={statsLoading}
        />
        <StatsCard
          title="المستثمرون النشطون"
          value={stats ? fmtNum(stats.activeInvestors) : "…"}
          icon={UserCheck}
          isLoading={statsLoading}
        />
        <StatsCard
          title="الأراضي تحت الإدارة (AUM)"
          value={stats ? fmtUSD(stats.aumUsd) : "…"}
          icon={TrendingUp}
          variant="gold"
          isLoading={statsLoading}
        />
        <StatsCard
          title="سعر SAK"
          value={stats ? fmtUSD(stats.sakPrice) : "…"}
          icon={Coins}
          isLoading={statsLoading}
        />
      </div>

      {/* Row 2 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="KYC بانتظار المراجعة"
          value={stats ? fmtNum(stats.pendingKyc) : "…"}
          icon={FileCheck2}
          isLoading={statsLoading}
        />
        <StatsCard
          title="إيداعات بانتظار الاعتماد"
          value={stats ? fmtNum(stats.pendingDeposits) : "…"}
          icon={ArrowDownToLine}
          isLoading={statsLoading}
        />
        <StatsCard
          title="سحوبات بانتظار الاعتماد"
          value={stats ? fmtNum(stats.pendingWithdrawals) : "…"}
          icon={ArrowUpFromLine}
          isLoading={statsLoading}
        />
        <StatsCard
          title="رصيد المحافظ"
          value={stats ? fmtUSD(stats.walletBalanceSum) : "…"}
          icon={Wallet}
          isLoading={statsLoading}
        />
      </div>

      {/* Row 3 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="المعاملات المعتمدة"
          value={stats ? fmtNum(stats.approvedDeposits + stats.approvedWithdrawals) : "…"}
          icon={BadgeCheck}
          isLoading={statsLoading}
        />
        <StatsCard
          title="إيداعات الشهر"
          value={stats ? fmtUSD(stats.monthlyDeposits) : "…"}
          icon={CreditCard}
          isLoading={statsLoading}
        />
        <StatsCard
          title="سحوبات الشهر"
          value={stats ? fmtUSD(stats.monthlyWithdrawals) : "…"}
          icon={Banknote}
          isLoading={statsLoading}
        />
        <StatsCard
          title="تسجيلات الشهر"
          value={stats ? fmtNum(stats.monthlyRegistrations) : "…"}
          icon={UserPlus}
          isLoading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-luxe p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4.5 w-4.5 text-gold" />
            الإيداعات vs السحوبات (آخر 12 شهر)
          </h3>
          {chartLoading ? (
            <Spinner className="py-8" />
          ) : chartRows.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="deposits"
                  name="الإيداعات"
                  fill="#C9A84C"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="withdrawals"
                  name="السحوبات"
                  fill="hsl(var(--muted-foreground))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="لا توجد بيانات بعد" />
          )}
        </div>

        <div className="card-luxe p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4.5 w-4.5 text-gold" />
            التسجيلات (آخر 12 شهر)
          </h3>
          {chartLoading ? (
            <Spinner className="py-8" />
          ) : chartRows.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="registrations"
                  name="التسجيلات"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={{ fill: "#C9A84C", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="لا توجد بيانات بعد" />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 card-luxe p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <Activity className="h-4.5 w-4.5 text-gold" />
          آخر النشاطات
        </h3>
        {activityLoading ? (
          <Spinner className="py-8" />
        ) : !activities?.length ? (
          <EmptyState title="لا توجد نشاطات بعد" />
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 15).map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </div>
        )}
      </div>

      {/* Pending Alerts */}
      <div className="mt-6 space-y-3">
        {stats && stats.pendingKyc > 0 && (
          <AlertRow
            color="destructive"
            label={`${stats.pendingKyc} طلب KYC بانتظار المراجعة`}
            to="/admin/kyc"
            icon={FileCheck2}
          />
        )}
        {stats && stats.pendingDeposits > 0 && (
          <AlertRow
            color="warning"
            label={`${stats.pendingDeposits} طلب إيداع معلّق`}
            to="/admin/deposits"
            icon={ArrowDownToLine}
          />
        )}
        {stats && stats.pendingWithdrawals > 0 && (
          <AlertRow
            color="info"
            label={`${stats.pendingWithdrawals} طلب سحب معلّق`}
            to="/admin/withdrawals"
            icon={ArrowUpFromLine}
          />
        )}
        {stats && !stats.pendingKyc && !stats.pendingDeposits && !stats.pendingWithdrawals && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm font-semibold text-success">
            ✓ لا توجد طلبات معلّقة — كل شيء تحت السيطرة
          </p>
        )}
      </div>
    </PortalShell>
  );
}

const ENTITY_ICONS: Record<string, typeof Users> = {
  user: Users,
  investor: Users,
  kyc: FileCheck2,
  transaction: TrendingUp,
  payment: ArrowDownToLine,
  notification: Wallet,
  project: Landmark,
  holding: Briefcase,
};

const ACTION_LABELS: Record<string, string> = {
  create: "إنشاء",
  update: "تحديث",
  delete: "حذف",
  approve: "اعتماد",
  reject: "رفض",
  login: "تسجيل دخول",
  logout: "تسجيل خروج",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function ActivityRow({ activity }: { activity: AdminActivity }) {
  const Icon = ENTITY_ICONS[activity.entityType] ?? Activity;
  const actionLabel = ACTION_LABELS[activity.action] ?? activity.action;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-sm hover:bg-secondary/30">
      <div className="rounded-lg bg-secondary p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          <span className="font-semibold">{activity.actorEmail}</span>
          <span className="mx-1.5 text-muted-foreground">{actionLabel}</span>
          <span className="text-muted-foreground">{activity.entityType}</span>
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {relativeTime(activity.createdAt)}
      </span>
    </div>
  );
}

function AlertRow({
  color,
  label,
  to,
  icon: Icon,
}: {
  color: "destructive" | "warning" | "info";
  label: string;
  to: "/admin/kyc" | "/admin/deposits" | "/admin/withdrawals";
  icon: typeof Users;
}) {
  const cls = {
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning",
    info: "border-info/40 bg-info/10 text-info",
  }[color];
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl border px-5 py-4 text-sm font-semibold ${cls}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4.5 w-4.5" />
        {label}
      </span>
      <span>راجع الآن ←</span>
    </Link>
  );
}
