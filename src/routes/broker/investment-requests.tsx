import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Pagination, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  investmentRequestsApi,
  unwrapPagination,
  unwrapRows,
  type InvestmentRequestRow,
} from "@/api/phase04.api";
import { FileText } from "lucide-react";

const searchSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/broker/investment-requests")({
  validateSearch: searchSchema,
  component: BrokerInvestmentRequests,
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

function usd(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BrokerInvestmentRequests() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const page = params.page ?? 1;

  const { data, isLoading } = useQuery({
    queryKey: ["broker", "investment-requests", statusFilter, page],
    queryFn: () =>
      investmentRequestsApi.list({
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const update = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      investmentRequestsApi.updateStatus(id, status, note),
    onSuccess: () => {
      toast.success("تم تحديث الطلب");
      qc.invalidateQueries({ queryKey: ["broker", "investment-requests"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-stats"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-recent"] });
    },
    onError: () => toast.error("تعذر التحديث"),
  });

  if (isLoading)
    return (
      <PortalShell title="طلبات الاستثمار المسندة">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data) as InvestmentRequestRow[];
  const pagination = unwrapPagination(data);

  return (
    <PortalShell title="طلبات الاستثمار المسندة">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() =>
              navigate({
                to: "/broker/investment-requests",
                search: f.value ? { status: f.value, page: 1 } : { page: 1 },
              })
            }
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === f.value
                ? "bg-gold-gradient text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="لا توجد طلبات مسندة إليك"
          description="عندما يُسند إليك عميل طلب استثمار، سيظهر هنا وفق حالته."
        />
      ) : (
        <>
          {typeof pagination?.total === "number" && (
            <p className="mb-3 text-sm text-muted-foreground">
              إجمالي الطلبات:{" "}
              <span className="num font-bold text-foreground">{pagination.total}</span>
            </p>
          )}
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{r.land?.titleAr ?? "أصل"}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    العميل:{" "}
                    <span className="font-semibold text-foreground">
                      {r.investor ? `${r.investor.firstName} ${r.investor.lastName}` : "عميل"}
                    </span>
                    {r.investor?.email ? <span className="num"> ({r.investor.email})</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    قيمة الاستثمار:{" "}
                    <span className="num font-bold text-foreground">{usd(r.amountUsd)} USD</span>
                    {" • "}
                    مصدر: <span>{r.source === "broker" ? "عبر وسيط" : "مباشر"}</span>
                  </p>
                  <p className="num mt-1 text-xs text-muted-foreground">
                    {new Date(r.createdAt ?? Date.now()).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {r.status === "submitted" && (
                    <button
                      className="rounded-lg bg-gold-gradient px-3.5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          id: r.id,
                          status: "under_review",
                          note: "تم الاستلام من الوسيط وإحالته للمراجعة",
                        })
                      }
                    >
                      {update.isPending ? "…" : "للمراجعة"}
                    </button>
                  )}
                  {r.status === "under_review" && (
                    <button
                      className="rounded-lg bg-destructive/15 px-3.5 py-2 text-xs font-bold text-destructive disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({ id: r.id, status: "rejected", note: "رفض من قبل الوسيط" })
                      }
                    >
                      رفض
                    </button>
                  )}
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
                to: "/broker/investment-requests",
                search: statusFilter ? { status: statusFilter, page: p } : { page: p },
              })
            }
          />
        </>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        تظهر هنا الطلبات المسندة إليك فقط.{" "}
        <Link to="/broker" className="text-gold hover:underline">
          العودة للوحة الوسيط
        </Link>
      </p>
    </PortalShell>
  );
}
