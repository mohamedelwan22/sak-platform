import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { brokerApi, adminPhase04Api } from "@/api/phase04.api";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/brokers/$id")({
  ssr: false,
  component: AdminBrokerDetail,
});

function fmtDateTime(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function AdminBrokerDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/brokers/$id" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["broker", id],
    queryFn: () => brokerApi.get(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["broker", id] });
    qc.invalidateQueries({ queryKey: ["admin", "brokers"] });
    qc.invalidateQueries({ queryKey: ["admin", "broker-applications"] });
  };

  const approve = useMutation({
    mutationFn: (brokerId: string) => adminPhase04Api.verifyBroker(brokerId, "verified"),
    onSuccess: () => {
      toast.success("تم اعتماد الوسيط");
      invalidate();
    },
    onError: () => toast.error("تعذر اعتماد الوسيط"),
  });

  const reject = useMutation({
    mutationFn: ({ brokerId, reason }: { brokerId: string; reason: string }) =>
      adminPhase04Api.verifyBroker(brokerId, "rejected", reason),
    onSuccess: () => {
      toast.success("تم رفض الطلب");
      setRejecting(false);
      setRejectReason("");
      invalidate();
    },
    onError: () => toast.error("تعذر رفض الطلب"),
  });

  const deactivate = useMutation({
    mutationFn: (brokerId: string) => adminPhase04Api.deactivateBroker(brokerId),
    onSuccess: () => {
      toast.success("تم تعطيل الوسيط");
      invalidate();
    },
    onError: () => toast.error("تعذر التعطيل"),
  });

  const activate = useMutation({
    mutationFn: (brokerId: string) => adminPhase04Api.activateBroker(brokerId),
    onSuccess: () => {
      toast.success("تم التفعيل");
      invalidate();
    },
    onError: () => toast.error("تعذر التفعيل"),
  });

  if (isLoading)
    return (
      <PortalShell title="تفاصيل الوسيط">
        <Spinner />
      </PortalShell>
    );

  const b = data?.data?.data;
  if (!b)
    return (
      <PortalShell title="تفاصيل الوسيط">
        <p>غير موجود</p>
      </PortalShell>
    );

  const status = b.verificationStatus;
  const isApplicationState = ["pending", "under_review", "rejected"].includes(status);
  const isActive = b.isActive !== false;

  return (
    <PortalShell title="تفاصيل الوسيط">
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => navigate({ to: "/admin/broker-applications" })}
          className="text-sm font-semibold text-muted-foreground hover:text-gold"
        >
          → العودة لطلبات الانضمام
        </button>

        <div className="card-luxe space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{b.displayName}</h2>
              <p className="num text-sm text-muted-foreground">
                {b.user?.firstName} {b.user?.lastName} ({b.user?.email})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={status} />
              {status === "verified" && isActive === false && <StatusBadge status="deactivated" />}
            </div>
          </div>

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">الشركة</dt>
              <dd>{b.company ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">رقم الرخصة</dt>
              <dd>{b.licenseNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">الهاتف</dt>
              <dd className="num">{b.user?.phone || b.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">هاتف الملف</dt>
              <dd className="num">{b.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">تاريخ التقديم</dt>
              <dd className="num">{fmtDateTime(b.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">تاريخ القرار</dt>
              <dd className="num">{status === "verified" ? fmtDateTime(b.verifiedAt) : "—"}</dd>
            </div>
          </dl>

          {status === "rejected" && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
              <p className="font-bold text-destructive">سبب الرفض</p>
              <p className="mt-1 text-destructive/90">{b.rejectionReason || "غير محدد"}</p>
            </div>
          )}

          {b.bio && <p className="rounded-xl bg-secondary/60 p-4 text-sm">{b.bio}</p>}
        </div>

        {Array.isArray(b.documents) && (
          <div className="card-luxe p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <FileText className="h-4 w-4 text-gold" /> المستندات ({b.documents.length})
            </h3>
            {b.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد مستندات مقدمة.</p>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {b.documents.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/50 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{d.type}</p>
                      {d.label && <p className="text-xs text-muted-foreground">{d.label}</p>}
                    </div>
                    <StatusBadge status={d.isVerified ? "verified" : "pending"} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card-luxe flex flex-wrap items-center gap-2 p-4">
          {isApplicationState && (
            <>
              <button
                className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                disabled={approve.isPending}
                onClick={() => approve.mutate(b.id)}
              >
                {approve.isPending ? "جارٍ…" : "اعتماد الوسيط"}
              </button>
              <button
                className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive"
                onClick={() => setRejecting(true)}
              >
                رفض الطلب
              </button>
            </>
          )}
          {status === "verified" &&
            (isActive ? (
              <button
                className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive"
                disabled={deactivate.isPending}
                onClick={() => deactivate.mutate(b.id)}
              >
                تعطيل الوسيط
              </button>
            ) : (
              <button
                className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground"
                disabled={activate.isPending}
                onClick={() => activate.mutate(b.id)}
              >
                إعادة التفعيل
              </button>
            ))}
          <Link
            to="/admin/brokers"
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
          >
            الوسطاء المعتمدون
          </Link>
        </div>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-luxe w-full max-w-md p-6">
            <h3 className="text-lg font-bold">رفض طلب الانضمام</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              placeholder="حدد سبب الرفض"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                onClick={() => {
                  setRejecting(false);
                  setRejectReason("");
                }}
              >
                إلغاء
              </button>
              <button
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() => reject.mutate({ brokerId: b.id, reason: rejectReason.trim() })}
              >
                {reject.isPending ? "جارٍ…" : "تأكيد الرفض"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
