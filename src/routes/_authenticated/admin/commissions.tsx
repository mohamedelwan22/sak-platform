import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { Check, X, Banknote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/commissions")({
  ssr: false,
  component: AdminCommissions,
});

function AdminCommissions() {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "commissions"],
    queryFn: () => adminPhase04Api.commissions({ limit: 100 }),
  });

  const approve = useMutation({
    mutationFn: (ids: string[]) => adminPhase04Api.approveCommissions(ids),
    onSuccess: () => {
      toast.success("تم اعتماد العمولات");
      qc.invalidateQueries({ queryKey: ["admin", "commissions"] });
    },
  });

  const reject = useMutation({
    mutationFn: (ids: string[]) =>
      adminPhase04Api.rejectCommissions(ids, reason || "مرفوض من الإدارة"),
    onSuccess: () => {
      toast.success("تم رفض العمولات");
      qc.invalidateQueries({ queryKey: ["admin", "commissions"] });
    },
  });

  if (isLoading)
    return (
      <PortalShell title="اعتماد العمولات">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data).filter((c) => c.status === "pending");
  const ids = rows.map((c) => c.id);

  return (
    <PortalShell title="اعتماد العمولات">
      {rows.length === 0 ? (
        <EmptyState icon={Banknote} title="لا توجد عمولات معلقة" />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              disabled={approve.isPending || ids.length === 0}
              onClick={() => approve.mutate(ids)}
            >
              <Check className="inline h-4 w-4" /> اعتماد المعلقة ({ids.length})
            </button>
            <input
              className="w-64 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
              placeholder="سبب الرفض"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              className="rounded-lg bg-destructive/15 px-5 py-2.5 text-sm font-bold text-destructive disabled:opacity-50"
              disabled={reject.isPending || ids.length === 0}
              onClick={() => reject.mutate(ids)}
            >
              <X className="inline h-4 w-4" /> رفض المعلقة
            </button>
          </div>

          {rows.map((c) => (
            <div key={c.id} className="card-luxe flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">{c.commissionUsd} USD</p>
                <p className="text-xs text-muted-foreground">
                  {c.commissionType} • {c.commissionSak} SAK • المستفيد {c.beneficiaryId}
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
