import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  investmentRequestsApi,
  INVESTMENT_PAYMENT_STATUS,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { openProtectedFile } from "@/lib/file-viewer";
import { fmtUSD, fmtDate, fmtDateTime } from "@/lib/format";
import { Briefcase, CreditCard, UserRound, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/investment-requests/$id")({
  component: InvestorRequestDetail,
});

const P = INVESTMENT_PAYMENT_STATUS;

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

function InvestorRequestDetail() {
  const { pathname } = useLocation();
  // The payment page is a nested child route — render it through the outlet.
  if (pathname.endsWith("/payment")) return <Outlet />;
  return <DetailView />;
}

function DetailView() {
  const { id } = useParams({ from: "/_authenticated/investment-requests/$id" });
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["investor", "investment-request", id],
    queryFn: () => investmentRequestsApi.get(id),
  });

  const cancel = useMutation({
    mutationFn: () => investmentRequestsApi.updateStatus(id, "cancelled"),
    onSuccess: () => {
      toast.success("تم إلغاء الطلب");
      qc.invalidateQueries({ queryKey: ["investor", "investment-request", id] });
      qc.invalidateQueries({ queryKey: ["investor", "investment-requests"] });
    },
    onError: () => toast.error("تعذر إلغاء الطلب في حالته الحالية"),
  });

  if (isLoading)
    return (
      <PortalShell title="تفاصيل طلب الاستثمار">
        <Spinner />
      </PortalShell>
    );

  const r = (data?.data?.data ?? null) as InvestmentRequestRow | null;
  if (!r)
    return (
      <PortalShell title="تفاصيل طلب الاستثمار">
        <p className="card-luxe p-6 text-sm text-muted-foreground">
          الطلب غير موجود أو لا تملك صلاحية عرضه.
        </p>
      </PortalShell>
    );

  const reason = r.rejectionReason ?? null;

  const timeline: Array<{ label: string; at?: string | null; done: boolean }> = [
    { label: "تم إنشاء طلب الاستثمار", at: r.createdAt, done: true },
    { label: "الدفع", at: r.paymentProofUploadedAt, done: r.paymentStatus !== P.PENDING },
    {
      label: "مراجعة إثبات الدفع",
      at: r.paymentReviewedAt,
      done: r.paymentStatus === P.CONFIRMED || r.paymentStatus === P.REJECTED,
    },
    {
      label: "اعتماد الاستثمار",
      at: r.status === "approved" || r.status === "invested" ? r.reviewedAt : null,
      done: ["approved", "invested"].includes(r.status),
    },
    {
      label: "تنفيذ الاستثمار وإنشاء الملكية",
      at: r.status === "invested" ? r.reviewedAt : null,
      done: r.status === "invested",
    },
  ];

  const canPay =
    ["submitted", "under_review"].includes(r.status) &&
    (r.paymentStatus === P.PENDING || r.paymentStatus === P.REJECTED);
  const canCancel = ["submitted", "under_review"].includes(r.status);

  return (
    <PortalShell title="تفاصيل طلب الاستثمار">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card-luxe p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
              <Briefcase className="h-4 w-4 text-gold" /> الاستثمار
            </h3>
            <div className="space-y-2 text-sm">
              <Row label="رقم الطلب" value={`#${r.id.slice(0, 8)}`} mono />
              <Row label="الأصل" value={r.land?.titleAr ?? "أصل"} />
              <Row label="المبلغ" value={`${fmtUSD(Number(r.amountUsd ?? 0))} USD`} gold />
              {r.holding?.sakOwned != null && (
                <Row label="الوحدات" value={`${Number(r.holding.sakOwned)} SAK`} mono />
              )}
              <Row
                label="المصدر"
                value={
                  r.source === "marketplace"
                    ? "شراء SAK من السوق عبر المحفظة"
                    : r.source === "broker" && r.broker
                      ? `عن طريق وسيط: ${r.broker.displayName}`
                      : "استثمار مباشر"
                }
              />
              <Row label="تاريخ الطلب" value={fmtDateTime(r.createdAt)} mono />
              <div className="flex justify-between gap-3 pt-1">
                <span className="text-muted-foreground">حالة الطلب</span>
                <StatusBadge status={r.status} />
              </div>
            </div>
          </div>

          <div className="card-luxe p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
              <CreditCard className="h-4 w-4 text-gold" /> الدفع
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">حالة الدفع</span>
                <StatusBadge status={r.paymentStatus} />
              </div>
              <Row label="طريقة الدفع" value={r.paymentMethod ?? "تحويل بنكي"} />
              <Row label="المبلغ المستحق" value={`${fmtUSD(Number(r.amountUsd ?? 0))} USD`} gold />
              {r.paymentProofUploadedAt && (
                <Row label="تاريخ رفع الإثبات" value={fmtDateTime(r.paymentProofUploadedAt)} mono />
              )}
              {r.paymentReviewedAt && (
                <Row label="تاريخ مراجعة الدفع" value={fmtDateTime(r.paymentReviewedAt)} mono />
              )}
              {r.paymentProofPath && (
                <button
                  onClick={() => openProtectedFile(`/api/v1/admin/files/${r.paymentProofPath}`)}
                  className="mt-2 w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  عرض إثبات الدفع المرفوع
                </button>
              )}
              {r.paymentStatus === P.REJECTED && r.paymentNote && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  سبب رفض الإثبات: {r.paymentNote}
                </p>
              )}
            </div>
          </div>

          {reason && (
            <div className="card-luxe border-destructive/30 p-5">
              <h3 className="mb-2 font-bold text-destructive">سبب رفض الطلب</h3>
              <p className="text-sm text-foreground">{reason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-luxe p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <History className="h-4 w-4 text-gold" /> سير الطلب
            </h3>
            <ol className="space-y-0">
              {timeline.map((step, i) => (
                <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span
                      className={`absolute top-5 right-[7px] h-full w-0.5 ${step.done ? "bg-gold/50" : "bg-border"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      step.done ? "border-gold bg-gold" : "border-border bg-secondary"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </p>
                    {step.at && (
                      <p className="num text-xs text-muted-foreground">{fmtDateTime(step.at)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {(canPay || canCancel) && (
            <div className="card-luxe space-y-2 p-5">
              {canPay && (
                <>
                  <p className="text-sm font-semibold text-warning">
                    الطلب بانتظار الدفع — لم يتم تنفيذ الاستثمار بعد.
                  </p>
                  <button
                    onClick={() =>
                      navigate({ to: "/investment-requests/$id/payment", params: { id } })
                    }
                    className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 text-sm font-bold text-primary-foreground"
                  >
                    {r.paymentStatus === P.REJECTED
                      ? "إعادة رفع إثبات الدفع"
                      : "الانتقال إلى الدفع"}
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد من إلغاء طلب الاستثمار؟")) cancel.mutate();
                  }}
                  disabled={cancel.isPending}
                  className="w-full rounded-xl bg-destructive/10 py-3 text-sm font-bold text-destructive disabled:opacity-50"
                >
                  {cancel.isPending ? "جارٍ الإلغاء…" : "إلغاء الطلب"}
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/investment-requests" className="text-gold hover:underline">
              العودة إلى طلبات الاستثمار
            </Link>
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
