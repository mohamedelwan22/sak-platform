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
import { t } from "@/i18n";

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
      toast.success(t("_authenticatedInvestment-requestsid.k17"));
      qc.invalidateQueries({ queryKey: ["investor", "investment-request", id] });
      qc.invalidateQueries({ queryKey: ["investor", "investment-requests"] });
    },
    onError: () => toast.error(t("_authenticatedInvestment-requestsid.k18")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedInvestment-requestsid.k4")}>
        <Spinner />
      </PortalShell>
    );

  const r = (data?.data?.data ?? null) as InvestmentRequestRow | null;
  if (!r)
    return (
      <PortalShell title={t("_authenticatedInvestment-requestsid.k5")}>
        <p className="card-luxe p-6 text-sm text-muted-foreground">
          {t("_authenticatedInvestment-requestsid.k10000")}
        </p>
      </PortalShell>
    );

  const reason = r.rejectionReason ?? null;

  const timeline: Array<{ label: string; at?: string | null; done: boolean }> = [
    { label: t("_authenticatedInvestment-requestsid.k19"), at: r.createdAt, done: true },
    {
      label: t("_authenticatedInvestment-requestsid.k20"),
      at: r.paymentProofUploadedAt,
      done: r.paymentStatus !== P.PENDING,
    },
    {
      label: t("_authenticatedInvestment-requestsid.k21"),
      at: r.paymentReviewedAt,
      done: r.paymentStatus === P.CONFIRMED || r.paymentStatus === P.REJECTED,
    },
    {
      label: t("_authenticatedInvestment-requestsid.k22"),
      at: r.status === "approved" || r.status === "invested" ? r.reviewedAt : null,
      done: ["approved", "invested"].includes(r.status),
    },
    {
      label: t("_authenticatedInvestment-requestsid.k23"),
      at: r.status === "invested" ? r.reviewedAt : null,
      done: r.status === "invested",
    },
  ];

  const canPay =
    ["submitted", "under_review"].includes(r.status) &&
    (r.paymentStatus === P.PENDING || r.paymentStatus === P.REJECTED);
  const canCancel = ["submitted", "under_review"].includes(r.status);

  return (
    <PortalShell title={t("_authenticatedInvestment-requestsid.k6")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card-luxe p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
              <Briefcase className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedInvestment-requestsid.k10000")}
            </h3>
            <div className="space-y-2 text-sm">
              <Row
                label={t("_authenticatedInvestment-requestsid.k7")}
                value={`#${r.id.slice(0, 8)}`}
                mono
              />
              <Row
                label={t("_authenticatedInvestment-requestsid.k8")}
                value={r.land?.titleAr ?? t("_authenticatedInvestment-requestsid.k24")}
              />
              <Row
                label={t("_authenticatedInvestment-requestsid.k9")}
                value={`${fmtUSD(Number(r.amountUsd ?? 0))} USD`}
                gold
              />
              {r.holding?.sakOwned != null && (
                <Row
                  label={t("_authenticatedInvestment-requestsid.k10")}
                  value={`${Number(r.holding.sakOwned)} SAK`}
                  mono
                />
              )}
              <Row
                label={t("_authenticatedInvestment-requestsid.k11")}
                value={
                  r.source === "marketplace"
                    ? t("_authenticatedInvestment-requestsid.k25")
                    : r.source === "broker" && r.broker
                      ? t("investmentRequestDetail.m1", { v: r.broker.displayName })
                      : t("_authenticatedInvestment-requestsid.k26")
                }
              />
              <Row
                label={t("_authenticatedInvestment-requestsid.k12")}
                value={fmtDateTime(r.createdAt)}
                mono
              />
              <div className="flex justify-between gap-3 pt-1">
                <span className="text-muted-foreground">
                  {t("_authenticatedInvestment-requestsid.k1")}
                </span>
                <StatusBadge status={r.status} />
              </div>
            </div>
          </div>

          <div className="card-luxe p-5">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
              <CreditCard className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedInvestment-requestsid.k10001")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("_authenticatedInvestment-requestsid.k2")}
                </span>
                <StatusBadge status={r.paymentStatus} />
              </div>
              <Row
                label={t("_authenticatedInvestment-requestsid.k13")}
                value={r.paymentMethod ?? t("_authenticatedInvestment-requestsid.k27")}
              />
              <Row
                label={t("_authenticatedInvestment-requestsid.k14")}
                value={`${fmtUSD(Number(r.amountUsd ?? 0))} USD`}
                gold
              />
              {r.paymentProofUploadedAt && (
                <Row
                  label={t("_authenticatedInvestment-requestsid.k15")}
                  value={fmtDateTime(r.paymentProofUploadedAt)}
                  mono
                />
              )}
              {r.paymentReviewedAt && (
                <Row
                  label={t("_authenticatedInvestment-requestsid.k16")}
                  value={fmtDateTime(r.paymentReviewedAt)}
                  mono
                />
              )}
              {r.paymentProofPath && (
                <button
                  onClick={() => openProtectedFile(`/api/v1/admin/files/${r.paymentProofPath}`)}
                  className="mt-2 w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  {t("_authenticatedInvestment-requestsid.k10001")}
                </button>
              )}
              {r.paymentStatus === P.REJECTED && r.paymentNote && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  {t("_authenticatedInvestment-requestsid.k10002")} {r.paymentNote}
                </p>
              )}
            </div>
          </div>

          {reason && (
            <div className="card-luxe border-destructive/30 p-5">
              <h3 className="mb-2 font-bold text-destructive">
                {t("_authenticatedInvestment-requestsid.k3")}
              </h3>
              <p className="text-sm text-foreground">{reason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-luxe p-5">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-foreground">
              <History className="h-4 w-4 text-gold" />{" "}
              {t("_authenticatedInvestment-requestsid.k10003")}
            </h3>
            <ol className="space-y-0">
              {timeline.map((step, i) => (
                <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span
                      className={`absolute top-5 start-[7px] h-full w-0.5 ${step.done ? "bg-gold/50" : "bg-border"}`}
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
                    {t("_authenticatedInvestment-requestsid.k10002")}
                  </p>
                  <button
                    onClick={() =>
                      navigate({ to: "/investment-requests/$id/payment", params: { id } })
                    }
                    className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 text-sm font-bold text-primary-foreground"
                  >
                    {r.paymentStatus === P.REJECTED
                      ? t("_authenticatedInvestment-requestsid.k28")
                      : t("_authenticatedInvestment-requestsid.k29")}
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  onClick={() => {
                    if (window.confirm(t("_authenticatedInvestment-requestsid.k30")))
                      cancel.mutate();
                  }}
                  disabled={cancel.isPending}
                  className="w-full rounded-xl bg-destructive/10 py-3 text-sm font-bold text-destructive disabled:opacity-50"
                >
                  {cancel.isPending
                    ? t("_authenticatedInvestment-requestsid.k31")
                    : t("_authenticatedInvestment-requestsid.k32")}
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/investment-requests" className="text-gold hover:underline">
              {t("_authenticatedInvestment-requestsid.k10003")}
            </Link>
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
