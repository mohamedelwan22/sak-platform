import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { investmentRequestsApi, INVESTMENT_PAYMENT_STATUS } from "@/api/phase04.api";
import { openProtectedFile } from "@/lib/file-viewer";
import { Briefcase, UserRound, Link2, CreditCard, History } from "lucide-react";
import { t } from "@/i18n";

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
  under_review: t("_authenticatedAdminInvestment-requestsid.k30"),
  approved: t("_authenticatedAdminInvestment-requestsid.k31"),
  rejected: t("_authenticatedAdminInvestment-requestsid.k32"),
  cancelled: t("_authenticatedAdminInvestment-requestsid.k33"),
  invested: t("_authenticatedAdminInvestment-requestsid.k34"),
  failed: t("_authenticatedAdminInvestment-requestsid.k35"),
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
      toast.success(t("_authenticatedAdminInvestment-requestsid.k36"));
      invalidate();
    },
    onError: () => toast.error(t("_authenticatedAdminInvestment-requestsid.k37")),
  });

  const rejectPayment = useMutation({
    mutationFn: (reason: string) => investmentRequestsApi.rejectPayment(id, reason),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminInvestment-requestsid.k38"));
      setRejectPaymentOpen(false);
      setPaymentNote("");
      invalidate();
    },
    onError: () => toast.error(t("_authenticatedAdminInvestment-requestsid.k39")),
  });

  const transition = useMutation({
    mutationFn: ({ status, note: n }: { status: string; note?: string }) =>
      investmentRequestsApi.updateStatus(id, status, n),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminInvestment-requestsid.k40"));
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
          ? t("_authenticatedAdminInvestment-requestsid.k41")
          : t("_authenticatedAdminInvestment-requestsid.k42"),
      );
      setNoteModal(null);
      setNote("");
    },
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedAdminInvestment-requestsid.k7")}>
        <Spinner />
      </PortalShell>
    );

  const r = data?.data?.data;
  if (!r)
    return (
      <PortalShell title={t("_authenticatedAdminInvestment-requestsid.k8")}>
        <p>{t("_authenticatedAdminInvestment-requestsid.k1")}</p>
      </PortalShell>
    );

  const P = INVESTMENT_PAYMENT_STATUS;
  const allowedRaw = ALLOWED[r.status] ?? [];
  // Task 6: t("_authenticatedAdminInvestment-requestsid.k43") only appears once payment is confirmed (server enforces the same rule).
  const paymentConfirmed = r.paymentStatus === P.CONFIRMED;
  const allowed = allowedRaw.filter((s) => s !== "approved" || paymentConfirmed);
  const approvalBlocked =
    allowedRaw.includes("approved") && !paymentConfirmed && r.status !== "rejected";
  const paymentReviewable = [P.PROOF_UPLOADED, P.UNDER_REVIEW].includes(r.paymentStatus);
  const units = r.holding?.sakOwned != null ? String(r.holding.sakOwned) : "—";

  const timeline: Array<{ label: string; at?: string | null; done: boolean }> = [
    { label: t("_authenticatedAdminInvestment-requestsid.k44"), at: r.createdAt, done: true },
    {
      label: t("_authenticatedAdminInvestment-requestsid.k45"),
      at: null,
      done: r.paymentStatus !== P.PENDING,
    },
    {
      label: t("_authenticatedAdminInvestment-requestsid.k46"),
      at: r.paymentProofUploadedAt,
      done: !!r.paymentProofUploadedAt,
    },
    {
      label:
        r.paymentStatus === P.REJECTED
          ? t("_authenticatedAdminInvestment-requestsid.k47")
          : t("_authenticatedAdminInvestment-requestsid.k48"),
      at: r.paymentReviewedAt,
      done: !!r.paymentReviewedAt,
    },
    {
      label: t("_authenticatedAdminInvestment-requestsid.k49"),
      at: ["approved", "invested"].includes(r.status) ? r.updatedAt : null,
      done: ["approved", "invested"].includes(r.status),
    },
    {
      label: t("_authenticatedAdminInvestment-requestsid.k50"),
      at: r.status === "invested" ? r.reviewedAt : null,
      done: r.status === "invested",
    },
  ];
  if (r.status === "rejected")
    timeline.push({
      label: t("adminInvestmentRequestDetail.m1", { v: r.rejectionReason ?? r.reviewNote ?? "" }),
      at: r.reviewedAt,
      done: true,
    });
  if (r.status === "cancelled")
    timeline.push({
      label: t("_authenticatedAdminInvestment-requestsid.k51"),
      at: r.updatedAt,
      done: true,
    });

  return (
    <PortalShell title={t("_authenticatedAdminInvestment-requestsid.k9")}>
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => navigate({ to: "/admin/investment-requests" })}
          className="text-sm font-semibold text-muted-foreground hover:text-gold"
        >
          {t("adminInvestmentDetail.m1")}
        </button>

        <div className="card-luxe space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="num text-xs font-bold text-gold">#{r.id}</p>
              <h2 className="text-xl font-bold">
                {r.land?.titleAr ?? t("_authenticatedAdminInvestment-requestsid.k52")}
              </h2>
            </div>
            <StatusBadge status={r.status} />
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <UserRound className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedAdminInvestment-requestsid.k10000")}
            </h3>
            <div className="space-y-2 text-sm">
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k10")}
                value={r.investor ? `${r.investor.firstName} ${r.investor.lastName}` : r.userId}
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k11")}
                value={r.investor?.email ?? "—"}
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k12")}
                value={r.investor?.phone ?? "—"}
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k13")}
                value={r.userId}
                mono
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Briefcase className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedAdminInvestment-requestsid.k10001")}
            </h3>
            <div className="space-y-2 text-sm">
              <Row label={t("_authenticatedAdminInvestment-requestsid.k14")} value={r.id} mono />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k15")}
                value={r.land?.titleAr ?? "—"}
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k16")}
                value={`${fmtUSD(r.amountUsd)} USD`}
                gold
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k17")}
                value={`${units} SAK`}
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k18")}
                value={fmtDT(r.createdAt)}
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k19")}
                value={fmtDT(r.updatedAt)}
                mono
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <CreditCard className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedAdminInvestment-requestsid.k10002")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("_authenticatedAdminInvestment-requestsid.k2")}
                </span>
                <StatusBadge status={r.paymentStatus} />
              </div>
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k20")}
                value={r.paymentMethod ?? "—"}
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k21")}
                value={`${fmtUSD(r.amountUsd)} USD`}
                gold
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k22")}
                value={fmtDT(r.paymentProofUploadedAt)}
                mono
              />
              <Row
                label={t("_authenticatedAdminInvestment-requestsid.k23")}
                value={fmtDT(r.paymentReviewedAt)}
                mono
              />
              {r.paymentNote && (
                <p
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    r.paymentStatus === INVESTMENT_PAYMENT_STATUS.REJECTED
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary/60 text-foreground"
                  }`}
                >
                  {r.paymentStatus === INVESTMENT_PAYMENT_STATUS.REJECTED
                    ? t("_authenticatedAdminInvestment-requestsid.k53")
                    : t("_authenticatedAdminInvestment-requestsid.k54")}
                  {r.paymentNote}
                </p>
              )}
              {r.paymentProofPath && (
                <button
                  onClick={() => openProtectedFile(`/api/v1/admin/files/${r.paymentProofPath}`)}
                  className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  {t("_authenticatedAdminInvestment-requestsid.k10000")}
                </button>
              )}
              {paymentReviewable && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => confirmPayment.mutate()}
                    disabled={confirmPayment.isPending}
                    className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {confirmPayment.isPending
                      ? t("_authenticatedAdminInvestment-requestsid.k55")
                      : t("_authenticatedAdminInvestment-requestsid.k56")}
                  </button>
                  <button
                    onClick={() => setRejectPaymentOpen(true)}
                    disabled={rejectPayment.isPending}
                    className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                  >
                    {t("_authenticatedAdminInvestment-requestsid.k10001")}
                  </button>
                </div>
              )}
              {approvalBlocked && (
                <p className="rounded-xl bg-warning/10 px-4 py-3 text-xs font-semibold text-warning">
                  {t("_authenticatedAdminInvestment-requestsid.k10002")}
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-bold">
              <Link2 className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedAdminInvestment-requestsid.k10003")}
            </h3>
            {r.source === "marketplace" ? (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <p className="font-semibold text-gold">
                  {t("_authenticatedAdminInvestment-requestsid.k3")}
                </p>
                <Row
                  label={t("_authenticatedAdminInvestment-requestsid.k24")}
                  value={r.paymentMethod ?? t("_authenticatedAdminInvestment-requestsid.k57")}
                />
                <Row
                  label={t("_authenticatedAdminInvestment-requestsid.k25")}
                  value={r.paymentStatus}
                />
              </div>
            ) : r.source === "broker" && r.broker ? (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                <p className="font-semibold text-gold">
                  {t("_authenticatedAdminInvestment-requestsid.k4")}
                </p>
                <Row
                  label={t("_authenticatedAdminInvestment-requestsid.k26")}
                  value={r.broker.displayName}
                />
                <Row
                  label={t("_authenticatedAdminInvestment-requestsid.k27")}
                  value={r.broker.company ?? "—"}
                />
                <Row
                  label={t("_authenticatedAdminInvestment-requestsid.k28")}
                  value={r.broker.id}
                  mono
                />
              </div>
            ) : (
              <p className="rounded-xl bg-secondary/50 p-4 text-sm font-semibold">
                {t("_authenticatedAdminInvestment-requestsid.k10003")}
              </p>
            )}
          </div>

          {r.reviewNote && (
            <div>
              <h3 className="mb-2 font-bold">{t("_authenticatedAdminInvestment-requestsid.k5")}</h3>
              <p className="rounded-xl bg-secondary/60 p-4 text-sm">{r.reviewNote}</p>
            </div>
          )}

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <History className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedAdminInvestment-requestsid.k10004")}
            </h3>
            <ol>
              {timeline.map((step, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span
                      className={`absolute top-5 start-[7px] h-full w-0.5 ${
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
                  ? t("_authenticatedAdminInvestment-requestsid.k58")
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
                noteModal.status === "rejected"
                  ? t("_authenticatedAdminInvestment-requestsid.k59")
                  : t("_authenticatedAdminInvestment-requestsid.k60")
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
                {t("_authenticatedAdminInvestment-requestsid.k10004")}
              </button>
              <button
                className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                disabled={transition.isPending || (noteModal.status === "rejected" && !note.trim())}
                onClick={() =>
                  transition.mutate({ status: noteModal.status, note: note.trim() || undefined })
                }
              >
                {t("_authenticatedAdminInvestment-requestsid.k10005")}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-luxe w-full max-w-md p-6">
            <h3 className="text-lg font-bold">
              {t("_authenticatedAdminInvestment-requestsid.k6")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("_authenticatedAdminInvestment-requestsid.k10006")}
            </p>
            <textarea
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              placeholder={t("_authenticatedAdminInvestment-requestsid.k29")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                onClick={() => {
                  setRejectPaymentOpen(false);
                  setPaymentNote("");
                }}
              >
                {t("_authenticatedAdminInvestment-requestsid.k10007")}
              </button>
              <button
                className="rounded-lg bg-destructive/15 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                disabled={rejectPayment.isPending || !paymentNote.trim()}
                onClick={() => rejectPayment.mutate(paymentNote.trim())}
              >
                {t("_authenticatedAdminInvestment-requestsid.k10008")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
