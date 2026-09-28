import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatsCard } from "@/components/shared/ui-kit";
import { affiliateApi } from "@/api/phase04.api";
import { Link2, Users, CheckCircle2, Wallet } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/referrals")({
  ssr: false,
  component: BrokerReferrals,
});

function BrokerReferrals() {
  const { data, isLoading } = useQuery({
    queryKey: ["referral", "stats"],
    queryFn: () => affiliateApi.stats(),
  });
  const { data: link } = useQuery({
    queryKey: ["referral", "link"],
    queryFn: () => affiliateApi.referralLink(),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerReferrals.k2")}>
        <Spinner />
      </PortalShell>
    );

  const stats = data?.data?.data ?? {};

  return (
    <PortalShell title={t("brokerReferrals.k3")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("brokerReferrals.k4")}
          value={String(stats.referredCount ?? 0)}
          icon={Users}
          variant="gold"
        />
        <StatsCard
          title={t("brokerReferrals.k5")}
          value={stats.totalCommissionsUsd ?? "0.00"}
          icon={Wallet}
        />
        <StatsCard
          title={t("brokerReferrals.k6")}
          value={stats.approvedCommissionsUsd ?? "0.00"}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title={t("brokerReferrals.k7")}
          value={stats.paidCommissionsUsd ?? "0.00"}
          icon={Wallet}
          variant="info"
        />
      </div>

      {link?.data?.data?.referralLink && (
        <div className="card-luxe mt-6 p-5">
          <div className="flex items-center gap-2 text-gold">
            <Link2 className="h-5 w-5" />
            <p className="font-semibold">{t("brokerReferrals.k1")}</p>
          </div>
          <p className="mt-3 break-all rounded-xl bg-secondary/60 p-3 text-sm" dir="ltr">
            {link.data.data.referralLink}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("brokerReferrals.k10000")}
            {link.data.data.referralCode}
          </p>
        </div>
      )}
    </PortalShell>
  );
}
