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
  { value: "", label: "الكل" },
  { value: "submitted", label: "جديد" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "invested", label: "مستثمر" },
  { value: "rejected", label: "مرفوض" },
  { value: "cancelled", label: "ملغي" },
  { value: "failed", label: "فشل" },
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
    return "مراجعة إثبات الدفع";
  if (r.status === "approved") return "تنفيذ الاستثمار";
  if (r.status === "invested") return "عرض التفاصيل";
  if (r.status === "rejected") return "عرض السبب";
  if (r.status === "cancelled" || r.status === "failed") return "عرض التفاصيل";
  if (r.paymentStatus === INVESTMENT_PAYMENT_STATUS.PENDING && r.status === "submitted")
    return "انتظار الدفع";
  return "مراجعة";
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
      <PortalShell title="طلبات الاستثمار">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data) as InvestmentRequestRow[];
  const pagination = unwrapPagination(data);

  return (
    <PortalShell title="طلبات الاستثمار">
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
          { value: "", label: "كل المصادر" },
          { value: "marketplace", label: "سوق SAK" },
          { value: "broker", label: "وسيط" },
          { value: "platform", label: "مباشر" },
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
          title="لا توجد طلبات استثمار"
          description={activeStatus ? "لا توجد طلبات بهذه الحالة." : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs font-bold text-gold">#{shortId(r.id)}</span>
                    <p className="font-semibold">{r.land?.titleAr ?? "أصل"}</p>
                    <StatusBadge status={r.status} />
                    <StatusBadge status={r.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    المستثمر:{" "}
                    <span className="font-semibold text-foreground">
                      {r.investor ? `${r.investor.firstName} ${r.investor.lastName}` : r.userId}
                    </span>
                    {r.investor?.email ? <span className="num"> ({r.investor.email})</span> : null}
                    {r.investor?.phone ? <span className="num"> — {r.investor.phone}</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    المبلغ:{" "}
                    <span className="num font-bold text-foreground">{fmtUSD(r.amountUsd)} USD</span>
                    <span className="mx-1.5">•</span>
                    {r.source === "marketplace" ? (
                      <span className="text-gold">شراء SAK من السوق (محفظة)</span>
                    ) : r.source === "broker" ? (
                      <span className="text-gold">
                        عن طريق وسيط{r.broker ? `: ${r.broker.displayName}` : ""}
                      </span>
                    ) : (
                      <span>استثمار مباشر</span>
                    )}
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    أُنشئ: {new Date(r.createdAt ?? Date.now()).toLocaleString()}
                    {" • "}
                    آخر تحديث: {new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toLocaleString()}
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
