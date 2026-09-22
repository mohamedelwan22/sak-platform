import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { viewingsApi, unwrapRows } from "@/api/phase04.api";
import { CalendarClock, Check, X } from "lucide-react";

export const Route = createFileRoute("/broker/viewings")({
  ssr: false,
  component: BrokerViewings,
});

function BrokerViewings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["viewings"],
    queryFn: () => viewingsApi.list({ limit: 100 }),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      viewingsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("تم تحديث طلب المعاينة");
      qc.invalidateQueries({ queryKey: ["viewings"] });
    },
    onError: () => toast.error("تعذر تحديث الطلب"),
  });

  if (isLoading)
    return (
      <PortalShell title="طلبات المعاينة">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title="طلبات المعاينة">
      {rows.length === 0 ? (
        <EmptyState icon={CalendarClock} title="لا توجد طلبات معاينة" />
      ) : (
        <div className="space-y-3">
          {rows.map((v) => (
            <div key={v.id} className="card-luxe flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">الأصل: {v.landId}</p>
                <p className="text-sm text-muted-foreground">
                  {v.scheduledAt ? new Date(v.scheduledAt).toLocaleString() : "بدون موعد"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={v.status} />
                {v.status === "pending" && (
                  <>
                    <button
                      className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold"
                      onClick={() => update.mutate({ id: v.id, status: "accepted" })}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg bg-destructive/15 px-3 py-1.5 text-sm font-bold text-destructive"
                      onClick={() => update.mutate({ id: v.id, status: "rejected" })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                )}
                {(v.status === "accepted" || v.status === "scheduled") && (
                  <button
                    className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-bold"
                    onClick={() => update.mutate({ id: v.id, status: "completed" })}
                  >
                    إكمال
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
