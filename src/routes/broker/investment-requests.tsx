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
import { t } from "@/i18n";

const searchSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/broker/investment-requests")({
  validateSearch: searchSchema,
  component: BrokerInvestmentRequests,
});

const FILTERS = [
  { value: "", label: t("brokerInvestment-requests.k5") },
  { value: "submitted", label: t("brokerInvestment-requests.k6") },
  { value: "under_review", label: t("brokerInvestment-requests.k7") },
  { value: "approved", label: t("brokerInvestment-requests.k8") },
  { value: "invested", label: t("brokerInvestment-requests.k9") },
  { value: "rejected", label: t("brokerInvestment-requests.k10") },
  { value: "cancelled", label: t("brokerInvestment-requests.k11") },
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
      toast.success(t("brokerInvestment-requests.k12"));
      qc.invalidateQueries({ queryKey: ["broker", "investment-requests"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-stats"] });
      qc.invalidateQueries({ queryKey: ["broker", "investment-recent"] });
    },
    onError: () => toast.error(t("brokerInvestment-requests.k13")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerInvestment-requests.k1")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data) as InvestmentRequestRow[];
  const pagination = unwrapPagination(data);

  return (
    <PortalShell title={t("brokerInvestment-requests.k2")}>
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
          title={t("brokerInvestment-requests.k3")}
          description={t("brokerInvestment-requests.k4")}
        />
      ) : (
        <>
          {typeof pagination?.total === "number" && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t("brokerInvestment-requests.k10000")}{" "}
              <span className="num font-bold text-foreground">{pagination.total}</span>
            </p>
          )}
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {r.land?.titleAr ?? t("brokerInvestment-requests.k14")}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("brokerInvestment-requests.k10001")}{" "}
                    <span className="font-semibold text-foreground">
                      {r.investor
                        ? `${r.investor.firstName} ${r.investor.lastName}`
                        : t("brokerInvestment-requests.k15")}
                    </span>
                    {r.investor?.email ? <span className="num"> ({r.investor.email})</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("brokerInvestment-requests.k10002")}{" "}
                    <span className="num font-bold text-foreground">{usd(r.amountUsd)} USD</span>
                    {" • "}
                    {t("brokerInvestment-requests.k10003")}{" "}
                    <span>
                      {r.source === "broker"
                        ? t("brokerInvestment-requests.k16")
                        : t("brokerInvestment-requests.k17")}
                    </span>
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
                          note: t("brokerInvestment-requests.k18"),
                        })
                      }
                    >
                      {update.isPending ? "…" : t("brokerInvestment-requests.k19")}
                    </button>
                  )}
                  {r.status === "under_review" && (
                    <button
                      className="rounded-lg bg-destructive/15 px-3.5 py-2 text-xs font-bold text-destructive disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          id: r.id,
                          status: "rejected",
                          note: t("brokerInvestment-requests.k20"),
                        })
                      }
                    >
                      {t("brokerInvestment-requests.k10000")}
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
        {t("brokerInvestment-requests.k10004")}{" "}
        <Link to="/broker" className="text-gold hover:underline">
          {t("brokerInvestment-requests.k10001")}
        </Link>
      </p>
    </PortalShell>
  );
}
