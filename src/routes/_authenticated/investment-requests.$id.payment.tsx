import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  investmentRequestsApi,
  INVESTMENT_PAYMENT_STATUS,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { openProtectedFile } from "@/lib/file-viewer";
import { fmtUSD } from "@/lib/format";
import { CreditCard, Upload, Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/investment-requests/$id/payment")({
  component: InvestmentPaymentPage,
});

const P = INVESTMENT_PAYMENT_STATUS;

const METHODS = [
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
  { value: "wallet", label: "محفظة" },
] as const;

function InvestmentPaymentPage() {
  const { id } = useParams({ from: "/_authenticated/investment-requests/$id/payment" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [method, setMethod] = useState<string>("bank_transfer");

  const { data, isLoading } = useQuery({
    queryKey: ["investor", "investment-request", id],
    queryFn: () => investmentRequestsApi.get(id),
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("أرفق إثبات الدفع أولاً");
      return investmentRequestsApi.uploadPaymentProof(id, file, method);
    },
    onSuccess: () => {
      toast.success("تم رفع إثبات الدفع — سيخضع لمراجعة الإدارة");
      qc.invalidateQueries({ queryKey: ["investor", "investment-request", id] });
      qc.invalidateQueries({ queryKey: ["investor", "investment-requests"] });
      navigate({ to: "/investment-requests/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message || "تعذر رفع الإثبات"),
  });

  if (isLoading)
    return (
      <PortalShell title="دفع طلب الاستثمار">
        <Spinner />
      </PortalShell>
    );

  const r = (data?.data?.data ?? null) as InvestmentRequestRow | null;
  if (!r)
    return (
      <PortalShell title="دفع طلب الاستثمار">
        <p className="card-luxe p-6 text-sm text-muted-foreground">
          الطلب غير موجود أو لا تملك صلاحية عرضه.
        </p>
      </PortalShell>
    );

  const requestActive = ["submitted", "under_review"].includes(r.status);
  const canUpload =
    requestActive && (r.paymentStatus === P.PENDING || r.paymentStatus === P.REJECTED);

  return (
    <PortalShell title="دفع طلب الاستثمار">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-semibold text-warning">
          تم إنشاء طلب الاستثمار بنجاح، لكن الاستثمار لم يتم تنفيذه بعد — أكمل الدفع وأرفق الإثبات
          لتبدأ مراجعة الإدارة.
        </p>

        <div className="card-luxe p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
            <CreditCard className="h-4 w-4 text-gold" /> ملخص الدفع
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأصل</span>
              <span className="font-semibold text-foreground">{r.land?.titleAr ?? "أصل"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الطلب</span>
              <span className="num font-semibold text-foreground">#{r.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حالة الطلب</span>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حالة الدفع</span>
              <StatusBadge status={r.paymentStatus} />
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">المبلغ المستحق</span>
              <span className="num text-lg font-bold text-gold">
                {fmtUSD(Number(r.amountUsd ?? 0))} USD
              </span>
            </div>
          </div>
        </div>

        {canUpload ? (
          <>
            <div className="card-luxe p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                <Landmark className="h-4 w-4 text-gold" /> طريقة الدفع والتعليمات
              </h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                      method === m.value
                        ? "bg-gold-gradient text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {method === "bank_transfer" ? (
                <div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                  <p className="mb-1 font-bold text-foreground">بيانات التحويل البنكي</p>
                  <p className="num">IBAN: SA00 0000 0000 0000 0000 0000</p>
                  <p className="mt-1 text-xs">
                    حوّل المبلغ المستحق ثم أرفق إثبات التحويل أدناه. لن يُنفَّذ الاستثمار إلا بعد
                    تأكيد الإدارة لاستلام المبلغ.
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                  أكمل الدفع بالطريقة المختارة ثم أرفق إثبات الدفع (صورة أو PDF) أدناه.
                </p>
              )}

              {r.paymentStatus === P.REJECTED && r.paymentNote && (
                <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  تم رفض الإثبات السابق: {r.paymentNote}
                </p>
              )}
            </div>

            <div className="card-luxe p-5">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
                <Upload className="h-4 w-4 text-gold" /> إثبات الدفع
              </h3>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition hover:border-gold/50 hover:text-foreground"
              >
                {file ? file.name : "اختر ملف الإثبات (صورة أو PDF — حد أقصى 5MB)"}
              </button>
              <button
                onClick={() => upload.mutate()}
                disabled={!file || upload.isPending}
                className="bg-gold-gradient shadow-gold mt-4 w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-50"
              >
                {upload.isPending
                  ? "جارٍ الرفع…"
                  : r.paymentStatus === P.REJECTED
                    ? "إرسال الإثبات الجديد"
                    : "إرسال إثبات الدفع"}
              </button>
            </div>
          </>
        ) : (
          <div className="card-luxe p-5 text-center">
            {r.paymentStatus === P.CONFIRMED ? (
              <p className="text-sm font-semibold text-success">
                تم تأكيد الدفع — طلبك الآن بانتظار اعتماد وتنفيذ الإدارة.
              </p>
            ) : r.paymentStatus === P.PROOF_UPLOADED || r.paymentStatus === P.UNDER_REVIEW ? (
              <p className="text-sm font-semibold text-info">
                إثبات الدفع قيد مراجعة الإدارة حالياً — ستصلك نتيجة المراجعة فور صدورها.
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                هذه الصفحة غير متاحة لحالة الطلب الحالية.
              </p>
            )}
            {r.paymentProofPath && (
              <button
                onClick={() => openProtectedFile(`/api/v1/admin/files/${r.paymentProofPath}`)}
                className="mt-3 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                عرض الإثبات المرفوع
              </button>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/investment-requests/$id" params={{ id }} className="text-gold hover:underline">
            العودة إلى تفاصيل الطلب
          </Link>
        </p>
      </div>
    </PortalShell>
  );
}
