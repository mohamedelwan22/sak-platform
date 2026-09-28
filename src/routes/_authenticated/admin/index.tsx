import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import { StatsCard, Spinner, EmptyState, Pagination } from "@/components/shared/ui-kit";
import {
  adminStatsExtended,
  adminChartData,
  adminActivity,
  type AdminActivity,
} from "@/lib/admin.functions";
import { fmtUSD, fmtNum } from "@/lib/format";
import { t } from "@/i18n";

/** Recent-activities page size. Mirrors ACTIVITY_PAGE_SIZE on the server. */
const ACTIVITY_PAGE_SIZE = 10;

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

  const [activityPage, setActivityPage] = useState(1);
  const {
    data: activityData,
    isLoading: activityLoading,
    isError: activityError,
  } = useQuery({
    queryKey: ["admin-activity", activityPage],
    queryFn: () => adminActivity(activityPage, ACTIVITY_PAGE_SIZE),
    // Keep the previous page on screen while the next one loads so the widget
    // does not flash empty on every page change.
    placeholderData: (prev) => prev,
  });
  const activities = activityData?.items;

  const chartRows = chartData
    ? chartData.months.map((m, i) => ({
        month: m,
        deposits: chartData.deposits[i] ?? 0,
        withdrawals: chartData.withdrawals[i] ?? 0,
        registrations: chartData.registrations[i] ?? 0,
      }))
    : [];

  return (
    <PortalShell title={t("_authenticatedAdminAdminIndex.k2")}>
      {/* Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k3")}
          value={stats ? fmtNum(stats.investors) : "…"}
          icon={Users}
          variant="info"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k4")}
          value={stats ? fmtNum(stats.activeInvestors) : "…"}
          icon={UserCheck}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k5")}
          value={stats ? fmtUSD(stats.aumUsd) : "…"}
          icon={TrendingUp}
          variant="gold"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k6")}
          value={stats ? fmtUSD(stats.sakPrice) : "…"}
          icon={Coins}
          variant="warning"
          isLoading={statsLoading}
        />
      </div>

      {/* Row 2 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k7")}
          value={stats ? fmtNum(stats.pendingKyc) : "…"}
          icon={FileCheck2}
          variant="warning"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k8")}
          value={stats ? fmtNum(stats.pendingDeposits) : "…"}
          icon={ArrowDownToLine}
          variant="info"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k9")}
          value={stats ? fmtNum(stats.pendingWithdrawals) : "…"}
          icon={ArrowUpFromLine}
          variant="warning"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k10")}
          value={stats ? fmtUSD(stats.walletBalanceSum) : "…"}
          icon={Wallet}
          variant="gold"
          isLoading={statsLoading}
        />
      </div>

      {/* Row 3 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k11")}
          value={stats ? fmtNum(stats.approvedDeposits + stats.approvedWithdrawals) : "…"}
          icon={BadgeCheck}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k12")}
          value={stats ? fmtUSD(stats.monthlyDeposits) : "…"}
          icon={CreditCard}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k13")}
          value={stats ? fmtUSD(stats.monthlyWithdrawals) : "…"}
          icon={Banknote}
          variant="danger"
          isLoading={statsLoading}
        />
        <StatsCard
          title={t("_authenticatedAdminAdminIndex.k14")}
          value={stats ? fmtNum(stats.monthlyRegistrations) : "…"}
          icon={UserPlus}
          variant="info"
          isLoading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-luxe p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4.5 w-4.5 text-gold" />
            {t("_authenticatedAdminIndex.k10000")}
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
                  name={t("_authenticatedAdminAdminIndex.k15")}
                  fill="#C9A84C"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="withdrawals"
                  name={t("_authenticatedAdminAdminIndex.k16")}
                  fill="hsl(var(--muted-foreground))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={t("_authenticatedAdminAdminIndex.k17")} />
          )}
        </div>

        <div className="card-luxe p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4.5 w-4.5 text-gold" />
            {t("_authenticatedAdminIndex.k10001")}
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
                  name={t("_authenticatedAdminAdminIndex.k18")}
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={{ fill: "#C9A84C", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title={t("_authenticatedAdminAdminIndex.k19")} />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 card-luxe p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <Activity className="h-4.5 w-4.5 text-gold" />
          {t("_authenticatedAdminIndex.k10002")}
        </h3>
        {activityError ? (
          <EmptyState title={t("errors.generic")} />
        ) : activityLoading ? (
          <Spinner className="py-8" />
        ) : !activities?.length ? (
          <EmptyState title={t("_authenticatedAdminAdminIndex.k20")} />
        ) : (
          <>
            <div
              className={`space-y-3 transition-opacity ${activityLoading ? "opacity-50" : "opacity-100"}`}
            >
              {activities.map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
            <Pagination
              page={activityData?.page ?? 1}
              totalPages={activityData?.totalPages ?? 1}
              total={activityData?.total}
              onPage={setActivityPage}
            />
          </>
        )}
      </div>

      {/* Pending Alerts */}
      <div className="mt-6 space-y-3">
        {stats && stats.pendingKyc > 0 && (
          <AlertRow
            color="destructive"
            label={t("adminIndex.m1", { v: stats.pendingKyc })}
            to="/admin/kyc"
            icon={FileCheck2}
          />
        )}
        {stats && stats.pendingDeposits > 0 && (
          <AlertRow
            color="warning"
            label={t("adminIndex.m2", { v: stats.pendingDeposits })}
            to="/admin/deposits"
            icon={ArrowDownToLine}
          />
        )}
        {stats && stats.pendingWithdrawals > 0 && (
          <AlertRow
            color="info"
            label={t("adminIndex.m3", { v: stats.pendingWithdrawals })}
            to="/admin/withdrawals"
            icon={ArrowUpFromLine}
          />
        )}
        {stats && !stats.pendingKyc && !stats.pendingDeposits && !stats.pendingWithdrawals && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-5 py-4 text-sm font-semibold text-success">
            {t("adminIndexLabels.m1")}
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
  create: t("_authenticatedAdminAdminIndex.k21"),
  update: t("_authenticatedAdminAdminIndex.k22"),
  delete: t("_authenticatedAdminAdminIndex.k23"),
  approve: t("_authenticatedAdminAdminIndex.k24"),
  reject: t("_authenticatedAdminAdminIndex.k25"),
  login: t("_authenticatedAdminAdminIndex.k26"),
  logout: t("_authenticatedAdminAdminIndex.k27"),
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t("_authenticatedAdminAdminIndex.k28");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("common.agoMinutes", { v: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("common.agoHours", { v: hours });
  const days = Math.floor(hours / 24);
  return t("common.agoDays", { v: days });
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
      <span>{t("_authenticatedAdminAdminIndex.k1")}</span>
    </Link>
  );
}
