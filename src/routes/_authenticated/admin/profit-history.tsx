import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatsCard } from "@/components/shared/ui-kit";
import { adminDataApi } from "@/api/admin-data.api";
import { fmtDateTime } from "@/lib/format";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/profit-history")({
  component: AdminProfitHistoryPage,
});

function AdminProfitHistoryPage() {
  const { data: distributions, isLoading } = useQuery({
    queryKey: ["profit-distributions"],
    queryFn: async () => {
      const res = await adminDataApi.profitDistributions({ limit: 100 });
      const raw = res.data?.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
      return items as Array<{
        id: string;
        totalProfitUsd: number;
        periodStart: string;
        periodEnd: string;
        distributedAt: string;
        land: { titleEn: string; titleAr: string };
        distributor: { firstName: string; lastName: string };
      }>;
    },
  });

  const totalDistributed = distributions?.reduce((sum, d) => sum + d.totalProfitUsd, 0) ?? 0;

  return (
    <PortalShell title={t("_authenticatedAdminProfit-history.k4")}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatsCard
              title={t("_authenticatedAdminProfit-history.k5")}
              value={`$${totalDistributed.toFixed(2)}`}
              icon={History}
              variant="gold"
            />
            <StatsCard
              title={t("_authenticatedAdminProfit-history.k6")}
              value={(distributions?.length ?? 0).toString()}
              icon={History}
              variant="info"
            />
            <StatsCard
              title={t("_authenticatedAdminProfit-history.k7")}
              value={distributions?.[0] ? fmtDateTime(distributions[0].distributedAt) : "-"}
              icon={History}
              variant="warning"
            />
          </div>

          {!distributions?.length ? (
            <EmptyState
              icon={History}
              title={t("_authenticatedAdminProfit-history.k8")}
              description={t("_authenticatedAdminProfit-history.k9")}
            />
          ) : (
            <div className="card-luxe overflow-x-auto !p-0">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-start">
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k10000")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k10001")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k1")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k2")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k3")}
                    </th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">
                      {t("_authenticatedAdminProfit-history.k10002")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {distributions.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3.5">{d.land.titleAr}</td>
                      <td className="num px-5 py-3.5 font-medium text-gold">
                        ${d.totalProfitUsd.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {new Date(d.periodStart).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {new Date(d.periodEnd).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="px-5 py-3.5">
                        {d.distributor.firstName} {d.distributor.lastName}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {fmtDateTime(d.distributedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
