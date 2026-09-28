import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { affiliateApi, unwrapRows } from "@/api/phase04.api";
import { Banknote } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/commissions")({
  ssr: false,
  component: BrokerCommissions,
});

function BrokerCommissions() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate", "commissions"],
    queryFn: () => affiliateApi.commissions({ limit: 100 }),
  });

  const withdraw = useMutation({
    mutationFn: (ids: string[]) => affiliateApi.withdrawalRequest(ids),
    onSuccess: () => {
      toast.success(t("brokerCommissions.k4"));
      qc.invalidateQueries({ queryKey: ["affiliate", "commissions"] });
      qc.invalidateQueries({ queryKey: ["referral", "stats"] });
    },
    onError: () => toast.error(t("brokerCommissions.k5")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerCommissions.k1")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);
  const approvedIds = rows.filter((c) => c.status === "approved").map((c) => c.id);

  return (
    <PortalShell title={t("brokerCommissions.k2")}>
      {rows.length === 0 ? (
        <EmptyState icon={Banknote} title={t("brokerCommissions.k3")} />
      ) : (
        <div className="space-y-3">
          {approvedIds.length > 0 && (
            <button
              className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate(approvedIds)}
            >
              {withdraw.isPending
                ? t("brokerCommissions.k6")
                : t("brokerCommissions.m1", { v: approvedIds.length })}
            </button>
          )}
          {rows.map((c) => (
            <div key={c.id} className="card-luxe flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{c.commissionUsd} USD</p>
                <p className="text-xs text-muted-foreground">
                  {t("brokerCommissions.k10000")} {c.commissionType} • {c.commissionSak} SAK
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
