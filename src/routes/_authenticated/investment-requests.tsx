import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Pagination, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  investmentRequestsApi,
  unwrapPagination,
  unwrapRows,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { fmtUSD, fmtDate } from "@/lib/format";
import { FileText, Send } from "lucide-react";

const searchSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/investment-requests")({
  validateSearch: searchSchema,
  component: InvestorInvestmentRequests,
});

const FILTERS = [
  { value: "", label: "الكل" },
  { value: "submitted", label: "جديد" },
  { value: "under_review", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "invested", label: "منفذ" },
  { value: "rejected", label: "مرفوض" },
  { value: "cancelled", label: "ملغي" },
] as const;

const PAGE_SIZE = 10;

function shortId(id?: string): string {
  return id ? id.slice(0, 8) : "-";
}

function InvestorInvestmentRequests() {
  const { pathname } = useLocation();
  // Nested detail/payment child routes render through the outlet (Tasks 4/5 routing pattern).
  const isChild = pathname !== "/investment-requests";
  if (isChild) return <Outlet />;
  return <RequestsList />;
}

function RequestsList() {
  const navigate = useNavigate();
  const params = Route.useSearch();
  const activeStatus = typeof params.status === "string" ? params.status : "";
  const page = params.page ?? 1;

  const { data, isLoading } = useQuery({
    queryKey: ["investor", "investment-requests", activeStatus, page],
    queryFn: () =>
      investmentRequestsApi.list({
        status: activeStatus || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const rows = unwrapRows(data) as InvestmentRequestRow[];
  const pagination = unwrapPagination(data);

  return (
    <PortalShell title="طلبات الاستثمار">
      <p className="mb-4 rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-sm font-semibold text-info">
        طلب الاستثمار ليس استثماراً منفذاً — يتحول إلى ملكية فقط بعد إتمام الدفع ومراجعة الإدارة
        وتنفيذ الطلب.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() =>
              navigate({
                to: "/investment-requests",
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

      {isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={activeStatus ? "لا توجد طلبات بهذه الحالة" : "لا توجد طلبات استثمار بعد"}
          description={activeStatus ? undefined : "ابدأ بإرسال أول طلب استثمار من صفحة الأصول"}
          action={
            !activeStatus ? (
              <Link
                to="/projects"
                className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                تصفح الأصول
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                to="/investment-requests/$id"
                params={{ id: r.id }}
                className="card-luxe grid gap-3 p-4 transition hover:border-gold/40 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-xs font-bold text-gold">#{shortId(r.id)}</span>
                    <p className="font-semibold text-foreground">
                      {r.land?.titleAr ?? r.land?.title_ar ?? "أصل"}
                    </p>
                    <StatusBadge status={r.status} />
                    <StatusBadge status={r.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    المبلغ:{" "}
                    <span className="num font-bold text-foreground">
                      {fmtUSD(Number(r.amountUsd ?? 0))}
                    </span>
                    <span className="mx-1.5">•</span>
                    {r.source === "marketplace" ? (
                      <span className="text-gold">عن طريق السوق (محفظة)</span>
                    ) : r.source === "broker" && r.broker ? (
                      <span className="text-gold">
                        عن طريق وسيط{r.broker ? `: ${r.broker.displayName}` : ""}
                      </span>
                    ) : (
                      <span>استثمار مباشر</span>
                    )}
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
                </div>
                <div className="flex items-center self-start sm:self-center">
                  <span className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-foreground">
                    عرض التفاصيل
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            page={pagination?.page ?? page}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total}
            onPage={(p) =>
              navigate({
                to: "/investment-requests",
                search: activeStatus ? { status: activeStatus, page: p } : { page: p },
              })
            }
          />
        </>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Send className="h-3.5 w-3.5 text-gold" />
        لمتابعة استثماراتك المنفذة توجه إلى{" "}
        <Link to="/portfolio" className="text-gold hover:underline">
          استثماراتي
        </Link>
      </p>
    </PortalShell>
  );
}
