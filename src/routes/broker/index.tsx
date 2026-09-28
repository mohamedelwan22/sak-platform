import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge, StatsCard } from "@/components/shared/ui-kit";
import {
  brokerApi,
  leadsApi,
  viewingsApi,
  bookingsApi,
  affiliateApi,
  investmentRequestsApi,
  unwrapRows,
} from "@/api/phase04.api";
import {
  Users,
  Send,
  Clock3,
  CheckCircle2,
  Coins,
  TrendingUp,
  Store,
  CalendarClock,
  UserRound,
  Link2,
  FileText,
  Briefcase,
} from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/")({
  ssr: false,
  component: BrokerDashboard,
});

function usd(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BrokerStatusBanner({
  status,
  isActive,
}: {
  status?: string;
  isActive?: boolean;
}): React.ReactNode | null {
  if (status === "verified" && isActive === false) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
        {t("brokerIndex.k10000")}
      </div>
    );
  }
  if (status === "verified") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        {t("brokerIndex.k10001")}
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
        {t("brokerIndex.k10002")}
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
        {t("brokerIndex.k10003")}
      </div>
    );
  }
  return null;
}

function BrokerDashboard() {
  const { data: me } = useQuery({ queryKey: ["broker", "me"], queryFn: () => brokerApi.me() });
  const profile = me?.data?.data;
  const brokerId = (profile?.id ?? "") as string;

  const statsQuery = useQuery({
    queryKey: ["broker", "investment-stats"],
    queryFn: () => investmentRequestsApi.stats(),
  });

  const recentQuery = useQuery({
    queryKey: ["broker", "investment-recent"],
    queryFn: () => investmentRequestsApi.list({ limit: 5 }),
  });

  const clientsQuery = useQuery({
    queryKey: ["broker", "clients", brokerId],
    queryFn: async () => {
      if (!brokerId) return null;
      const res = await brokerApi.clients(brokerId);
      return res;
    },
    enabled: Boolean(brokerId),
  });

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list({ limit: 100 }),
  });
  const viewingsQuery = useQuery({
    queryKey: ["viewings"],
    queryFn: () => viewingsApi.list({ limit: 100 }),
  });
  const bookingsQuery = useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingsApi.list({ limit: 100 }),
  });
  const referralQuery = useQuery({
    queryKey: ["referral", "stats"],
    queryFn: () => affiliateApi.stats(),
  });

  if (!me)
    return (
      <PortalShell title={t("brokerbrokerIndex.k5")}>
        <Spinner />
      </PortalShell>
    );

  const stats = statsQuery.data?.data?.data;
  const leadsCount = unwrapRows(leadsQuery.data).length;
  const viewingsCount = unwrapRows(viewingsQuery.data).length;
  const bookingsCount = unwrapRows(bookingsQuery.data).length;
  const clientsCount = unwrapRows(clientsQuery.data).length;
  const recentRows = unwrapRows(recentQuery.data) as Array<{
    id: string;
    amountUsd: number | string;
    status: string;
    source: string;
    createdAt: string;
    land?: { titleAr?: string | null } | null;
    investor?: { firstName?: string; lastName?: string } | null;
  }>;

  const isVerifiedActive =
    profile?.verificationStatus === "verified" && profile?.isActive !== false;
  const isLoading = Boolean(statsQuery.isLoading || recentQuery.isLoading);

  return (
    <PortalShell title={t("brokerbrokerIndex.k6")}>
      <div className="space-y-6">
        <BrokerStatusBanner status={profile?.verificationStatus} isActive={profile?.isActive} />

        {/* Platform / broker profile header */}
        <div className="card-luxe flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gold/15 p-3">
              <UserRound className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("brokerbrokerIndex.k1")}</p>
              <p className="text-xl font-bold">{profile?.displayName}</p>
              {profile?.company ? (
                <p className="text-sm text-muted-foreground">{profile.company}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={profile?.verificationStatus ?? "pending"}
              label={
                profile?.verificationStatus === "verified" && profile?.isActive === false
                  ? t("brokerbrokerIndex.k24")
                  : undefined
              }
            />
            <Link
              to="/broker/profile"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground hover:bg-gold/15 hover:text-gold"
            >
              {t("brokerIndex.k10004")}
            </Link>
          </div>
        </div>

        {/* KPI cards — all real backend data */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title={t("brokerbrokerIndex.k7")}
            value={String(clientsCount)}
            subtitle={t("brokerbrokerIndex.k8")}
            icon={Users}
            variant="gold"
            isLoading={clientsQuery.isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k9")}
            value={String(stats?.total ?? 0)}
            subtitle={t("brokerbrokerIndex.k10")}
            icon={Send}
            isLoading={isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k11")}
            value={String(stats?.pending ?? 0)}
            subtitle={t("brokerbrokerIndex.k12")}
            icon={Clock3}
            variant="warning"
            isLoading={isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k13")}
            value={String(stats?.invested ?? 0)}
            subtitle={t("brokerbrokerIndex.k14")}
            icon={CheckCircle2}
            variant="success"
            isLoading={isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k15")}
            value={`$${usd(stats?.investedUsd)}`}
            subtitle={t("brokerbrokerIndex.k16")}
            icon={Coins}
            variant="success"
            isLoading={isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k17")}
            value={`$${usd(referralQuery.data?.data?.data?.approvedCommissionsUsd)}`}
            subtitle={t("brokerbrokerIndex.k18")}
            icon={TrendingUp}
            variant="gold"
            isLoading={referralQuery.isLoading}
          />
        </div>

        {/* Secondary stats: leads / viewings / bookings */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title={t("brokerbrokerIndex.k19")}
            value={String(leadsCount)}
            icon={Users}
            isLoading={leadsQuery.isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k20")}
            value={String(viewingsCount)}
            icon={CalendarClock}
            variant="info"
            isLoading={viewingsQuery.isLoading}
          />
          <StatsCard
            title={t("brokerbrokerIndex.k21")}
            value={String(bookingsCount)}
            icon={Store}
            variant="info"
            isLoading={bookingsQuery.isLoading}
          />
        </div>

        {isVerifiedActive ? (
          <>
            {/* Recent assigned investment requests */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t("brokerbrokerIndex.k2")}</h2>
                <Link
                  to="/broker/investment-requests"
                  className="text-sm font-semibold text-gold hover:underline"
                >
                  {t("brokerIndex.k10005")}
                </Link>
              </div>
              {recentQuery.isLoading ? (
                <Spinner />
              ) : recentRows.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t("brokerbrokerIndex.k22")}
                  description={t("brokerbrokerIndex.k23")}
                />
              ) : (
                <div className="space-y-3">
                  {recentRows.map((r) => (
                    <div
                      key={r.id}
                      className="card-luxe flex flex-wrap items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {r.land?.titleAr ?? t("brokerbrokerIndex.k25")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {r.investor
                            ? `${r.investor.firstName} ${r.investor.lastName}`
                            : t("brokerbrokerIndex.k26")}{" "}
                          • {usd(r.amountUsd)} USD
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.createdAt ?? Date.now()).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Broker operations */}
            <section>
              <h2 className="mb-3 text-lg font-bold">{t("brokerbrokerIndex.k3")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    to: "/broker/clients",
                    label: t("brokerbrokerIndex.k27"),
                    desc: t("brokerbrokerIndex.k28"),
                    icon: Users,
                  },
                  {
                    to: "/broker/leads",
                    label: t("brokerbrokerIndex.k29"),
                    desc: t("brokerbrokerIndex.k30"),
                    icon: Link2,
                  },
                  {
                    to: "/broker/investment-requests",
                    label: t("brokerbrokerIndex.k31"),
                    desc: t("brokerbrokerIndex.k32"),
                    icon: FileText,
                  },
                  {
                    to: "/broker/viewings",
                    label: t("brokerbrokerIndex.k33"),
                    desc: t("brokerbrokerIndex.k34"),
                    icon: CalendarClock,
                  },
                  {
                    to: "/broker/bookings",
                    label: t("brokerbrokerIndex.k35"),
                    desc: t("brokerbrokerIndex.k36"),
                    icon: Store,
                  },
                  {
                    to: "/broker/commissions",
                    label: t("brokerbrokerIndex.k37"),
                    desc: t("brokerbrokerIndex.k38"),
                    icon: Briefcase,
                  },
                ].map((op) => (
                  <Link
                    key={op.to}
                    to={op.to}
                    className="card-luxe flex items-start gap-3 p-4 transition-colors hover:border-gold/50"
                  >
                    <div className="rounded-xl bg-gold/10 p-2.5">
                      <op.icon className="h-5 w-5 text-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold">{op.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{op.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="card-luxe p-6">
            <h2 className="text-lg font-bold">{t("brokerbrokerIndex.k4")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("brokerIndex.k10006")}
              {t("brokerIndex.k10007")}
              {t("brokerIndex.k10008")}
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
