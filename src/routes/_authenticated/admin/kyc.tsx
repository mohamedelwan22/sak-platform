import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { adminListKyc, adminReviewKyc, adminSignedUrl } from "@/lib/admin.functions";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: AdminKycPage,
});

const docLabel: Record<string, string> = { national_id: "هوية وطنية", passport: "جواز سفر", driver_license: "رخصة قيادة" };

function AdminKycPage() {
  const listFn = useServerFn(adminListKyc);
  const reviewFn = useServerFn(adminReviewKyc);
  const signFn = useServerFn(adminSignedUrl);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-kyc-pending"],
    queryFn: () => listFn({ data: { status: "pending" } }),
  });

  const review = useMutation({
    mutationFn: (vars: { id: string; approve: boolean; reason?: string }) => reviewFn({ data: vars }),
    onSuccess: () => {
      toast.success("تم تنفيذ القرار");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openDoc(path: string) {
    try {
      const { url } = await signFn({ data: { bucket: "kyc-documents", path } });
      window.open(url, "_blank");
    } catch {
      toast.error("تعذّر فتح المستند");
    }
  }

  return (
    <PortalShell title="مراجعة طلبات KYC">
      {isLoading ? (
        <Spinner />
      ) : !rows?.length ? (
        <EmptyState title="لا طلبات معلّقة" description="كل طلبات التحقق تمت مراجعتها" />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="card-luxe p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-foreground">{r.profile?.full_name || "مستثمر"}</p>
                  <p className="num text-xs text-muted-foreground">{r.profile?.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {docLabel[r.document_type]} — قُدِّم في {fmtDateTime(r.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button onClick={() => openDoc(r.front_image_path)} className="rounded-lg bg-secondary px-3 py-1.5 font-semibold text-foreground hover:bg-accent">الوجه الأمامي</button>
                  {r.back_image_path && <button onClick={() => openDoc(r.back_image_path!)} className="rounded-lg bg-secondary px-3 py-1.5 font-semibold text-foreground hover:bg-accent">الوجه الخلفي</button>}
                  <button onClick={() => openDoc(r.selfie_image_path)} className="rounded-lg bg-secondary px-3 py-1.5 font-semibold text-foreground hover:bg-accent">السيلفي</button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => review.mutate({ id: r.id, approve: true })}
                  disabled={review.isPending}
                  className="rounded-lg bg-success px-5 py-2 text-sm font-bold text-success-foreground disabled:opacity-50"
                >
                  ✓ اعتماد
                </button>
                <input
                  placeholder="سبب الرفض (إلزامي عند الرفض)"
                  value={reason[r.id] ?? ""}
                  onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                  className="min-w-52 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
                />
                <button
                  onClick={() => review.mutate({ id: r.id, approve: false, reason: reason[r.id] })}
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
    </PortalShell>
  );
}
