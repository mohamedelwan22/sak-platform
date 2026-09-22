import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { investmentRequestsApi, INVESTMENT_PAYMENT_STATUS } from "@/api/phase04.api";
import { openProtectedFile } from "@/lib/file-viewer";
import { Briefcase, UserRound, Link2, CreditCard, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/investment-requests/$id")({
  component: AdminInvestmentRequestDetail,
});

function fmtUSD(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDT(value?: string): string {
  return value ? new Date(value).toLocaleString() : "—";
}

// Mirrors the backend state machine (server TRANSITIONS). The server is authoritative.

const ACTION_LABELS: Record<string, string> = {
  under_review: "بدء المراجعة",
  approved: "اعتماد",
  rejected: "رفض الطلب",
  cancelled: "إلغاء الطلب",
  invested: "تنفيذ الاستثمار",
  failed: "تحديد كفشل",
};

const ALLOWED: Record<string, string[]> = {
  submitted: ["under_review", "approved", "rejected", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["invested", "cancelled", "failed"],
  invested: [],
  rejected: [],
  cancelled: [],
  failed: [],
};

function Row({
  label,
  value,
  gold,
  mono,
}: {
  label: string;
  value: string;
  gold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`${mono ? "num" : ""} text-left font-semibold ${gold ? "text-gold" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function AdminInvestmentRequestDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/investment-requests/$id" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [noteModal, setNoteModal] = useState<{ status: string; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [rejectPaymentOpen, setRejectPaymentOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "investment-request", id],
    queryFn: () => investmentRequestsApi.get(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "investment-request", id] });
    qc.invalidateQueries({ queryKey: ["admin", "investment-requests"] });
    qc.invalidateQueries({ queryKey: ["broker", "investment-requests"] });
    qc.invalidateQueries({ queryKey: ["broker", "investment-stats"] });
  };

  const confirmPayment = useMutation({
    mutationFn: () => investmentRequestsApi.confirmPayment(id),
    onSuccess: () => {
      toast.success("تم تأكيد الدفع");
      invalidate();
    },
    onError: () => toast.error("تعذر تأكيد الدفع في الحالة الحالية"),
  });

  const rejectPayment = useMutation({
    mutationFn: (reason: string) => investmentRequestsApi.rejectPayment(id, reason),
    onSuccess: () => {
      toast.success("تم رفض إثبات الدفع وإشعار المستثمر");
      setRejectPaymentOpen(false);
      setPaymentNote("");
      invalidate();
    },
    onError: () => toast.error("تعذر رفض إثبات الدفع"),
  });

  const transition = useMutation({
    mutationFn: ({ status, note: n }: { status: string; note?: string }) =>
      investmentRequestsApi.updateStatus(id, status, n),
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      setNoteModal(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "investment-request", id] });
      qc.invalidateQueries({ queryKey: ["admin", "investment-requests"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-requests"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-stats"] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.includes("transition") || msg.includes("Cannot")
          ? "التحويل غير مسموح لهذه الحالة"
          : "تعذر تحديث الطلب",
      );
      setNoteModal(null);
      setNote("");
    },
  });

  if (isLoading)
    return (
      <PortalShell title="تفاصيل طلب الاستثمار">
        <Spinner />
      </PortalShell>
    );

  const r = data?.data?.data;
  if (!r)
    return (
      <PortalShell title="تفاصيل طلب الاستثمار">
        <p>غير موجود</p>
      </PortalShell>
    );

  const P = INVESTMENT_PAYMENT_STATUS;
  const allowedRaw = ALLOWED[r.status] ?? [];
  // Task 6: "اعتماد" only appears once payment is confirmed (server enforces the same rule).
  const paymentConfirmed = r.paymentStatus === P.CONFIRMED;
  const allowed = allowedRaw.filter((s) => s !== "approved" || paymentConfirmed);
  const approvalBlocked =
    allowedRaw.includes("approved") && !paymentConfirmed && r.status !== "rejected";
  const paymentReviewable = [P.PROOF_UPLOADED, P.UNDER_REVIEW].includes(r.paymentStatus);
  const units = r.holding?.sakOwned != null ? String(r.holding.sakOwned) : "—";

  const timeline: Array<{ label: string; at?: string | null; done: boolean }> = [
    { label: "تم إنشاء طلب الاستثمار", at: r.createdAt, done: true },
    { label: "بانتظار الدفع", at: null, done: r.paymentStatus !== P.PENDING },
    {
      label: "تم رفع إثبات الدفع",
      at: r.paymentProofUploadedAt,
      done: !!r.paymentProofUploadedAt,
    },
    {
      label: r.paymentStatus === P.REJECTED ? "تم رفض إثبات الدفع" : "تم تأكيد الدفع",
      at: r.paymentReviewedAt,
      done: !!r.paymentReviewedAt,
    },
    {
      label: "اعتماد الاستثمار",
      at: ["approved", "invested"].includes(r.status) ? r.updatedAt : null,
      done: ["approved", "invested"].includes(r.status),
    },
    {
      label: "تنفيذ الاستثمار وإنشاء الملكية",
      at: r.status === "invested" ? r.reviewedAt : null,
      done: r.status === "invested",
    },
  ];
  if (r.status === "rejected")
    timeline.push({
      label: `رفض الطلب: ${r.rejectionReason ?? r.reviewNote ?? ""}`,
      at: r.reviewedAt,
      done: true,
    });
  if (r.status === "cancelled")
    timeline.push({ label: "تم إلغاء الطلب", at: r.updatedAt, done: true });

  return (
    <PortalShell title="تفاصيل طلب الاستثمار">
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => navigate({ to: "/admin/investment-requests" })}
          className="text-sm font-semibold text-muted-foreground hover:text-gold"
        >
          → العودة لطلبات الاستثمار
        </button>

        <div className="card-luxe space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="num text-xs font-bold text-gold">#{r.id}</p>
              <h2 className="text-xl font-bold">{r.land?.titleAr ?? "أصل"}</h2>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <UserRound className="h-4 w-4 text-gold" /> المستثمر
            </h3>
            <div className="space-y-2 text-sm">
              <Row
                label="الاسم"
                value={r.investor ? `${r.investor.firstName} ${r.investor.lastName}` : r.userId}
              />
              <Row label="البريد" value={r.investor?.email ?? "—"} mono />
              <Row label="الهاتف" value={r.investor?.phone ?? "—"} mono />
              <Row label="معرّف المستثمر" value={r.userId} mono />
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Briefcase className="h-4 w-4 text-gold" /> تفاصيل الاستثمار
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="معرّف الطلب" value={r.id} mono />
              <Row label="الأصل / المشروع" value={r.land?.titleAr ?? "—"} />
              <Row label="المبلغ" value={`${fmtUSD(r.amountUsd)} USD`} gold mono />
              <Row label="الكمية (وحدات)" value={`${units} SAK`} mono />
              <Row label="تاريخ الإنشاء" value={fmtDT(r.createdAt)} mono />
              <Row label="آخر تحديث" value={fmtDT(r.updatedAt)} mono />
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <CreditCard className="h-4 w-4 text-gold" /> الدفع
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">حالة الدفع</span>
                <StatusBadge status={r.paymentStatus} />
              </div>
              <Row label="طريقة الدفع" value={r.paymentMethod ?? "—"} />
              <Row label="المبلغ المستحق" value={`${fmtUSD(r.amountUsd)} USD`} gold mono />
              <Row label="تاريخ رفع الإثبات" value={fmtDT(r.paymentProofUploadedAt)} mono />
              <Row label="تاريخ مراجعة الدفع" value={fmtDT(r.paymentReviewedAt)} mono />
              {r.paymentNote && (
                <p
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    r.paymentStatus === INVESTMENT_PAYMENT_STATUS.REJECTED
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary/60 text-foreground"
                  }`}
                >
                  {r.paymentStatus === INVESTMENT_PAYMENT_STATUS.REJECTED
                    ? "سبب الرفض: "
                    : "ملاحظة الدفع: "}
                  {r.paymentNote}
                </p>
              )}
              {r.paymentProofPath && (
                <button
                  onClick={() => openProtectedFile(`/api/v1/admin/files/${r.paymentProofPath}`)}
                  className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  عرض إثبات الدفع
                </button>
              )}
              {paymentReviewable && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => confirmPayment.mutate()}
                    disabled={confirmPayment.isPending}
                    className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {confirmPayment.isPending ? "جارٍ…" : "تأكيد استلام المبلغ"}
                  </button>
                  <button
                    onClick={() => setRejectPaymentOpen(true)}
                    disabled={rejectPayment.isPending}
                    className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                  >
                    رفض إثبات الدفع
                  </button>
                </div>
              )}
              {approvalBlocked && (
                <p className="rounded-xl bg-warning/10 px-4 py-3 text-xs font-semibold text-warning">
                  لا يمكن اعتماد الاستثمار قبل تأكيد استلام المبلغ — راجع إثبات الدفع أولاً.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Link2 className="h-4 w-4 text-gold" /> مصدر الطلب
            </h3>
            {r.source === "marketplace" ? (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <p className="font-semibold text-gold">شراء SAK من السوق عبر المحفظة</p>
                <Row label="طريقة الدفع" value={r.paymentMethod ?? "محفظة SAK"} />
                <Row label="حالة الدفع" value={r.paymentStatus} />
              </div>
            ) : r.source === "broker" && r.broker ? (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <p className="font-semibold text-gold">عن طريق وسيط</p>
                <Row label="اسم الوسيط" value={r.broker.displayName} />
                <Row label="الشركة" value={r.broker.company ?? "—"} />
                <Row label="معرّف ملف الوسيط" value={r.broker.id} mono />
              </div>
            ) : (
              <p className="rounded-xl bg-secondary/50 p-4 text-sm font-semibold">
                استثمار مباشر من المنصة
              </p>
            )}
          </div>

          {r.reviewNote && (
            <div>
              <h3 className="mb-2 font-bold">ملاحظة المراجعة</h3>
              <p className="rounded-xl bg-secondary/60 p-4 text-sm">{r.reviewNote}</p>
            </div>
          )}

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <History className="h-4 w-4 text-gold" /> سير الطلب
            </h3>
            <ol>
              {timeline.map((step, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span
                      className={`absolute top-5 right-[7px] h-full w-0.5 ${
                        step.done ? "bg-gold/50" : "bg-border"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      step.done ? "border-gold bg-gold" : "border-border bg-secondary"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        step.done ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.at && (
                      <p className="num text-xs text-muted-foreground">{fmtDT(step.at)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {allowed.length > 0 && (
          <div className="card-luxe flex flex-wrap items-center gap-2 p-4">
            {allowed.map((s) => (
              <button
                key={s}
                className={
                  s === "approved" || s === "invested"
                    ? "rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    : s === "rejected" || s === "failed"
                      ? "rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                      : "rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50"
                }
                disabled={transition.isPending}
                onClick={() => {
                  if (s === "rejected" || s === "failed" || s === "cancelled") {
                    setNoteModal({ status: s, label: ACTION_LABELS[s] ?? s });
                  } else {
                    transition.mutate({ status: s });
                  }
                }}
              >
                {transition.isPending && transition.variables?.status === s
                  ? "جارٍ…"
                  : (ACTION_LABELS[s] ?? s)}
              </button>
            ))}
          </div>
        )}
      </div>

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-luxe w-full max-w-md p-6">
            <h3 className="text-lg font-bold">{noteModal.label}</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              placeholder={
                noteModal.status === "rejected" ? "سبب الرفض (إلزامي)" : "سبب الإجراء (اختياري)"
              }
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                onClick={() => {
                  setNoteModal(null);
                  setNote("");
                }}
              >
                إلغاء
              </button>
              <button
                className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                disabled={transition.isPending || (noteModal.status === "rejected" && !note.trim())}
                onClick={() =>
                  transition.mutate({ status: noteModal.status, note: note.trim() || undefined })
                }
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-luxe w-full max-w-md p-6">
            <h3 className="text-lg font-bold">رفض إثبات الدفع</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              سيتم إشعار المستثمر بالسبب ويمكنه رفع إثبات جديد.
            </p>
            <textarea
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              placeholder="سبب رفض إثبات الدفع (إلزامي)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                onClick={() => {
                  setRejectPaymentOpen(false);
                  setPaymentNote("");
                }}
              >
                إلغاء
              </button>
              <button
                className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                disabled={rejectPayment.isPending || !paymentNote.trim()}
                onClick={() => rejectPayment.mutate(paymentNote.trim())}
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
