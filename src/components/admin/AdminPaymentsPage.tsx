import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminListPayments, adminReviewPayment } from "@/lib/admin.functions";
import { openProtectedFile } from "@/lib/file-viewer";
import { fmtUSD, fmtDateTime, fmtNum } from "@/lib/format";

export function AdminPaymentsPage({
  type,
  title,
}: {
  type: "deposit" | "withdrawal";
  title: string;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-payments", type],
    queryFn: () => adminListPayments(type),
  });

  const review = useMutation({
    mutationFn: (vars: { id: string; approve: boolean; reason?: string }) =>
      adminReviewPayment(vars),
    onSuccess: () => {
      toast.success("تم تنفيذ القرار");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (rows ?? []).filter((r) => r.status === "pending");
  const history = (rows ?? []).filter((r) => r.status !== "pending");

  return (
    <PortalShell title={title}>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-bold text-foreground">قيد المراجعة ({pending.length})</h2>
            {!pending.length ? (
              <EmptyState title="لا طلبات معلّقة" />
            ) : (
              <div className="space-y-4">
                {pending.map((r) => (
                  <div key={r.id} className="card-luxe p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">
                          {r.profile?.full_name || "مستثمر"}
                        </p>
                        <p className="num text-xs text-muted-foreground">{r.profile?.email}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fmtDateTime(r.created_at)}
                        </p>
                      </div>
                      <p className="num text-xl font-bold text-gold">
                        {fmtUSD(Number(r.usd_amount))}
                      </p>
                      {r.proof_path && (
                        <button
                          onClick={() => openProtectedFile(`/api/v1/admin/files/${r.proof_path}`)}
                          className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
                        >
                          عرض الإثبات
                        </button>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => review.mutate({ id: r.id, approve: true })}
                        disabled={review.isPending}
                        className="rounded-lg bg-success px-5 py-2 text-sm font-bold text-success-foreground disabled:opacity-50"
                      >
                        ✓ اعتماد {type === "deposit" ? "وتحويل إلى SAK" : "وخصم من المحفظة"}
                      </button>
                      <input
                        placeholder="سبب الرفض"
                        value={reason[r.id] ?? ""}
                        onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                        className="min-w-48 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                      />
                      <button
                        onClick={() =>
                          review.mutate({ id: r.id, approve: false, reason: reason[r.id] })
                        }
                        disabled={review.isPending}
                        className="rounded-lg bg-destructive px-5 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                      >
                        ✗ رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 font-bold text-foreground">السجل</h2>
            {!history.length ? (
              <EmptyState title="لا سجل بعد" />
            ) : (
              <div className="card-luxe overflow-x-auto !p-0">
                <table className="w-full min-w-140 text-sm">
                  <thead>
                    <tr className="border-b border-border text-right text-xs text-muted-foreground">
                      <th className="px-5 py-3 font-semibold">المستثمر</th>
                      <th className="px-5 py-3 font-semibold">USD</th>
                      <th className="px-5 py-3 font-semibold">SAK</th>
                      <th className="px-5 py-3 font-semibold">التاريخ</th>
                      <th className="px-5 py-3 font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-b border-border/50">
                        <td className="px-5 py-3 text-foreground">{r.profile?.full_name || "—"}</td>
                        <td className="num px-5 py-3">{fmtUSD(Number(r.usd_amount))}</td>
                        <td className="num px-5 py-3">
                          {r.sak_amount ? fmtNum(Number(r.sak_amount), 2) : "—"}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {fmtDateTime(r.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}
