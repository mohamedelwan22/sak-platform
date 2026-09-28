import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Pagination, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  investmentRequestsApi,
  unwrapPagination,
  unwrapRows,
  INVESTMENT_PAYMENT_STATUS,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { FileText } from "lucide-react";
import { t } from "@/i18n";

const searchSchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/admin/investment-requests")({
  validateSearch: searchSchema,
  component: AdminInvestmentRequests,
});

const FILTERS = [
  { value: "", label: t("_authenticatedAdminInvestment-requests.k5") },
  { value: "submitted", label: t("_authenticatedAdminInvestment-requests.k6") },
  { value: "under_review", label: t("_authenticatedAdminInvestment-requests.k7") },
  { value: "approved", label: t("_authenticatedAdminInvestment-requests.k8") },
  { value: "invested", label: t("_authenticatedAdminInvestment-requests.k9") },
  { value: "rejected", label: t("_authenticatedAdminInvestment-requests.k10") },
  { value: "cancelled", label: t("_authenticatedAdminInvestment-requests.k11") },
  { value: "failed", label: t("_authenticatedAdminInvestment-requests.k12") },
] as const;

const PAGE_SIZE = 10;

function fmtUSD(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortId(id?: string): string {
  return id ? id.slice(0, 8) : "-";
}

/** State-aware primary action label (server state machine stays authoritative). */
function actionLabel(r: InvestmentRequestRow): string {
  if (["proof_uploaded", INVESTMENT_PAYMENT_STATUS.UNDER_REVIEW].includes(r.paymentStatus))
    return t("_authenticatedAdminInvestment-requests.k13");
  if (r.status === "approved") return t("_authenticatedAdminInvestment-requests.k14");
  if (r.status === "invested") return t("_authenticatedAdminInvestment-requests.k15");
  if (r.status === "rejected") return t("_authenticatedAdminInvestment-requests.k16");
  if (r.status === "cancelled" || r.status === "failed")
    return t("_authenticatedAdminInvestment-requests.k17");
  if (r.paymentStatus === INVESTMENT_PAYMENT_STATUS.PENDING && r.status === "submitted")
    return t("_authenticatedAdminInvestment-requests.k18");
  return t("_authenticatedAdminInvestment-requests.k19");
}

function AdminInvestmentRequests() {
  const { pathname } = useLocation();
  const isDetail =
    pathname.startsWith("/admin/investment-requests/") && pathname !== "/admin/investment-requests";
  if (isDetail) return <Outlet />;
  return <RequestsList />;
}

function RequestsList() {
  const navigate = useNavigate();
  const params = Route.useSearch();
  const activeStatus = typeof params.status === "string" ? params.status : "";
  const activeSource = typeof params.source === "string" ? params.source : "";
  const page = params.page ?? 1;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "investment-requests", activeStatus, activeSource, page],
    queryFn: () =>
      investmentRequestsApi.list({
        limit: PAGE_SIZE,
        page,
        status: activeStatus || undefined,
        source: activeSource || undefined,
      }),
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedAdminInvestment-requests.k2")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data) as InvestmentRequestRow[];
  const pagination = unwrapPagination(data);

  return (
    <PortalShell title={t("_authenticatedAdminInvestment-requests.k3")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() =>
              navigate({
                to: "/admin/investment-requests",
                search: f.value ? { status: f.value, page: 1 } : { page: 1 },
              })
            }
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeStatus === f.value
                ? "bg-gold-gradient text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { value: "", label: t("_authenticatedAdminInvestment-requests.k20") },
          { value: "marketplace", label: t("_authenticatedAdminInvestment-requests.k21") },
          { value: "broker", label: t("_authenticatedAdminInvestment-requests.k22") },
          { value: "platform", label: t("_authenticatedAdminInvestment-requests.k23") },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() =>
              navigate({
                to: "/admin/investment-requests",
                search: activeStatus
                  ? { status: activeStatus, source: s.value || undefined, page: 1 }
                  : { source: s.value || undefined, page: 1 },
              })
            }
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeSource === s.value
                ? "bg-gold-gradient text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("_authenticatedAdminInvestment-requests.k4")}
          description={activeStatus ? t("_authenticatedAdminInvestment-requests.k24") : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs font-bold text-gold">#{shortId(r.id)}</span>
                    <p className="font-semibold">
                      {r.land?.titleAr ?? t("_authenticatedAdminInvestment-requests.k25")}
                    </p>
                    <StatusBadge status={r.status} />
                    <StatusBadge status={r.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("_authenticatedAdminInvestment-requests.k10000")}{" "}
                    <span className="font-semibold text-foreground">
                      {r.investor ? `${r.investor.firstName} ${r.investor.lastName}` : r.userId}
                    </span>
                    {r.investor?.email ? <span className="num"> ({r.investor.email})</span> : null}
                    {r.investor?.phone ? <span className="num"> — {r.investor.phone}</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("_authenticatedAdminInvestment-requests.k10001")}{" "}
                    <span className="num font-bold text-foreground">{fmtUSD(r.amountUsd)} USD</span>
                    <span className="mx-1.5">•</span>
                    {r.source === "marketplace" ? (
                      <span className="text-gold">
                        {t("_authenticatedAdminInvestment-requests.k10002")}
                      </span>
                    ) : r.source === "broker" ? (
                      <span className="text-gold">
                        {t("_authenticatedAdminInvestment-requests.k10003")}
                        {r.broker ? `: ${r.broker.displayName}` : ""}
                      </span>
                    ) : (
                      <span>{t("_authenticatedAdminInvestment-requests.k1")}</span>
                    )}
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {t("_authenticatedAdminInvestment-requests.k10004")}{" "}
                    {new Date(r.createdAt ?? Date.now()).toLocaleString()}
                    {" • "}
                    {t("_authenticatedAdminInvestment-requests.k10005")}{" "}
                    {new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Link
                    to="/admin/investment-requests/$id"
                    params={{ id: r.id }}
                    className="rounded-lg bg-gold-gradient px-4 py-2 text-xs font-bold text-primary-foreground"
                  >
                    {actionLabel(r)}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={pagination?.page ?? page}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total}
            onPage={(p) =>
              navigate({
                to: "/admin/investment-requests",
                search: {
                  ...(activeStatus && { status: activeStatus }),
                  ...(activeSource && { source: activeSource }),
                  page: p,
                },
              })
            }
          />
        </>
      )}
    </PortalShell>
  );
}
