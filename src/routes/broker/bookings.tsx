import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { bookingsApi, unwrapRows } from "@/api/phase04.api";
import { Store } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/bookings")({
  ssr: false,
  component: BrokerBookings,
});

function BrokerBookings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingsApi.list({ limit: 100 }),
  });

  const update = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      bookingsApi.updateStatus(id, status, notes),
    onSuccess: () => {
      toast.success(t("brokerBookings.k5"));
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: () => toast.error(t("brokerBookings.k6")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerBookings.k2")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title={t("brokerBookings.k3")}>
      {rows.length === 0 ? (
        <EmptyState icon={Store} title={t("brokerBookings.k4")} />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="card-luxe flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("brokerBookings.k10000")}
                  {b.landId}
                </p>
                {b.holdingId && <p className="text-xs text-gold">{t("brokerBookings.k1")}</p>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                {b.status === "under_review" && (
                  <button
                    className="rounded-lg bg-gold-gradient px-3 py-1.5 text-sm font-bold text-primary-foreground"
                    onClick={() => update.mutate({ id: b.id, status: "approved" })}
                  >
                    {t("brokerBookings.k10001")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
