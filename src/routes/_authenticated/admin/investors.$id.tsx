import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge, StatsCard } from "@/components/shared/ui-kit";
import { adminPhase04Api } from "@/api/phase04.api";
import { fmtNum, fmtDateTime } from "@/lib/format";
import { Users, Wallet, TrendingUp, Shield, Calendar, FileText } from "lucide-react";
import { t } from "@/i18n";
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

export const Route = createFileRoute("/_authenticated/admin/investors/$id")({
  component: AdminInvestorsDetail,
});

function AdminInvestorsDetail() {
  const params = Route.useParams();
  const id = params.id;

  // Main investor data query
  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ["admin-investor", id],
    queryFn: async () => {
      const res = await adminPhase04Api.customerById(id);
      return res.data;
    },
    enabled: !!id,
  });

  // KYC data query
  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-kyc", id],
    queryFn: async () => {
      const res = await adminPhase04Api.kycList({ status: "all", page: 1, limit: 10 });
      return res.data.data?.find((k: any) => k.userId === id) || null;
    },
    enabled: !!id,
  });

  // Holdings query
  const { data: holdingsData, isLoading: holdingsLoading } = useQuery({
    queryKey: ["admin-holdings", id],
    queryFn: async () => {
      const res = await adminPhase04Api.holdings({ customerId: id, limit: 100 });
      return res.data;
    },
    enabled: !!id,
  });

  // Investment requests query
  const { data: investmentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-investment-requests", id],
    queryFn: async () => {
      const res = await adminPhase04Api.investmentRequests({ limit: 100, status: "all" });
      return res.data;
    },
    enabled: !!id,
  });

  if (investorLoading || kycLoading || holdingsLoading) {
    return (
      <PortalShell title={t("_authenticatedAdminInvestorsid.k23")}>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </PortalShell>
    );
  }

  if (!investor) {
    return (
      <PortalShell title={t("_authenticatedAdminInvestorsid.k24")}>
        <div className="card-luxe p-8 text-center">
          <p className="text-muted-foreground">{t("_authenticatedAdminInvestorsid.k1")}</p>
        </div>
      </PortalShell>
    );
  }

  const stats: Array<{
    title: string;
    value: string | number;
    icon: typeof Wallet;
    variant: "default" | "gold" | "success" | "danger" | "warning" | "info";
  }> = [
    {
      title: t("_authenticatedAdminInvestorsid.k28"),
      value: fmtNum(investor.investmentCount || 0),
      icon: TrendingUp,
      variant: "gold" as const,
    },
    {
      title: t("_authenticatedAdminInvestorsid.k29"),
      value: fmtNum(investor.walletBalance || 0) + " SAK",
      icon: Wallet,
      variant: "success" as const,
    },
    {
      title: t("_authenticatedAdminInvestorsid.k30"),
      value: kycData?.status || t("_authenticatedAdminInvestorsid.k31"),
      icon: Shield,
      variant:
        kycData?.status === "VERIFIED"
          ? "success"
          : kycData?.status === "REJECTED"
            ? "danger"
            : "warning",
    },
    {
      title: t("_authenticatedAdminInvestorsid.k32"),
      value: fmtDateTime(investor.createdAt),
      icon: Calendar,
      variant: "info" as const,
    },
  ];

  return (
    <PortalShell title={t("_authenticatedAdminInvestorsid.k25")}>
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {investor.firstName} {investor.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {investor.email} • {investor.phone || t("_authenticatedAdminInvestorsid.k33")}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge
              status={
                investor.status === "active"
                  ? "success"
                  : investor.status === "suspended"
                    ? "warning"
                    : "destructive"
              }
              label={
                investor.status === "active"
                  ? t("_authenticatedAdminInvestorsid.k34")
                  : investor.status === "suspended"
                    ? t("_authenticatedAdminInvestorsid.k35")
                    : t("_authenticatedAdminInvestorsid.k36")
              }
            />
            {investor.status === "inactive" && (
              <StatusBadge status="secondary" label={t("_authenticatedAdminInvestorsid.k26")} />
            )}
            <ImpersonateButton
              targetUserId={id}
              targetLabel={investor.email}
              disabled={investor.status !== "active"}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={String(stat.value)}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity Section */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-gold" />
            {t("_authenticatedAdminInvestorsid.k10000")}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k2")}
              </span>
              <span className="font-medium">{investor.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k3")}
              </span>
              <span className="font-medium">{investor.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k4")}
              </span>
              <span className="font-mono text-xs">{investor.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k5")}
              </span>
              <span>{investor.phone || t("_authenticatedAdminInvestorsid.k37")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k6")}
              </span>
              <span className="font-mono font-bold text-gold">{investor.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k7")}
              </span>
              <span>{fmtDateTime(investor.createdAt)}</span>
            </div>
          </div>

          {investor.deletedAt && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{t("_authenticatedAdminInvestorsid.k8")}</p>
              <p className="text-xs text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k10000")} {fmtDateTime(investor.deletedAt)}
              </p>
            </div>
          )}
        </div>

        {/* KYC Section */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Shield className="h-5 w-5 text-gold" />
            {t("_authenticatedAdminInvestorsid.k10001")}
          </h2>
          {kycLoading ? (
            <Spinner className="h-6 w-6" />
          ) : kycData ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("_authenticatedAdminInvestorsid.k9")}
                </span>
                <StatusBadge status={kycData.status.toLowerCase()} label={kycData.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("_authenticatedAdminInvestorsid.k10")}
                </span>
                <span>{kycData.documentType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("_authenticatedAdminInvestorsid.k11")}
                </span>
                <span>{fmtDateTime(kycData.createdAt)}</span>
              </div>
              {kycData.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("_authenticatedAdminInvestorsid.k12")}
                  </span>
                  <span>{fmtDateTime(kycData.reviewedAt)}</span>
                </div>
              )}
              {kycData.rejectionReason && (
                <div className="mt-3 rounded-lg bg-destructive/10 p-3">
                  <p className="text-sm font-semibold text-destructive">
                    {t("_authenticatedAdminInvestorsid.k13")}
                  </p>
                  <p className="text-sm">{kycData.rejectionReason}</p>
                </div>
              )}
              {kycData.reviewedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("_authenticatedAdminInvestorsid.k14")}
                  </span>
                  <span>{kycData.reviewedBy}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">{t("_authenticatedAdminInvestorsid.k15")}</p>
              <StatusBadge status="secondary" label={t("_authenticatedAdminInvestorsid.k27")} />
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="card-luxe p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-gold" />
            {t("_authenticatedAdminInvestorsid.k10002")}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k16")}
              </span>
              <span className="font-bold text-gold">{fmtNum(investor.walletBalance || 0)} SAK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k17")}
              </span>
              <span className="font-medium">{investor.investmentCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k18")}
              </span>
              <span className="font-medium">{fmtNum(investor.totalInvestmentValue || 0)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k19")}
              </span>
              <span>{investor.brokerCommission || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedAdminInvestorsid.k20")}
              </span>
              <span>{investor.transactionCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="card-luxe p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-gold" />
          {t("_authenticatedAdminInvestorsid.k10001")}
          {holdingsLoading ? "..." : holdingsData?.length || 0})
        </h2>
        {holdingsLoading ? (
          <Spinner className="h-6 w-6" />
        ) : holdingsData?.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {holdingsData.map((holding: any) => (
              <div
                key={holding.id}
                className="rounded-lg border border-border p-4 hover:bg-secondary/50 transition-colors"
              >
                <h3 className="font-semibold text-foreground">{holding.assetName}</h3>
                <p className="text-sm text-muted-foreground">{holding.assetType}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span>
                    {t("_authenticatedAdminInvestorsid.k10003")}
                    {fmtNum(holding.quantity)}
                  </span>
                  <span className="font-medium">{fmtNum(holding.value)} USD</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("_authenticatedAdminInvestorsid.k10002")} {fmtDateTime(holding.maturityDate)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("_authenticatedAdminInvestorsid.k21")}</p>
          </div>
        )}
      </div>

      {/* Investment Requests Section */}
      <div className="card-luxe p-6 mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5 text-gold" />
          {t("_authenticatedAdminInvestorsid.k10003")}
          {investmentRequests?.length || 0})
        </h2>
        {requestsLoading ? (
          <Spinner className="h-6 w-6" />
        ) : investmentRequests?.length ? (
          <div className="space-y-3">
            {investmentRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div>
                  <h3 className="font-semibold">{request.projectName}</h3>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>
                <div className="text-start">
                  <StatusBadge status={request.status.toLowerCase()} label={request.status} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmtDateTime(request.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t("_authenticatedAdminInvestorsid.k22")}</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
