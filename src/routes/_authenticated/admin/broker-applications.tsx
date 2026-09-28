import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { FileText, Search, Users } from "lucide-react";
import { t } from "@/i18n";

const searchSchema = z.object({ status: z.string().optional() });

export const Route = createFileRoute("/_authenticated/admin/broker-applications")({
  validateSearch: searchSchema,
  component: AdminBrokerApplications,
});

type ApplicationStatus = "pending" | "under_review" | "rejected";

const TABS: Array<{ value: string; label: string; statuses?: ApplicationStatus[] }> = [
  {
    value: "",
    label: t("_authenticatedAdminBroker-applications.k8"),
    statuses: ["pending", "under_review", "rejected"],
  },
  {
    value: "pending",
    label: t("_authenticatedAdminBroker-applications.k9"),
    statuses: ["pending"],
  },
  {
    value: "under_review",
    label: t("_authenticatedAdminBroker-applications.k10"),
    statuses: ["under_review"],
  },
  {
    value: "rejected",
    label: t("_authenticatedAdminBroker-applications.k11"),
    statuses: ["rejected"],
  },
];

function fmtDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function AdminBrokerApplications() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = Route.useSearch();
  const activeTab = typeof params.status === "string" ? params.status : "";
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rejecting, setRejecting] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const statuses = TABS.find((t) => t.value === activeTab)?.statuses ?? [
    "pending",
    "under_review",
    "rejected",
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "broker-applications", activeTab, searchInput],
    queryFn: () =>
      adminPhase04Api.brokers({
        statuses: statuses.join(","),
        search: searchInput || undefined,
        limit: 100,
      }),
  });

  const approve = useMutation({
    mutationFn: (id: string) => adminPhase04Api.verifyBroker(id, "verified"),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminBroker-applications.k12"));
      qc.invalidateQueries({ queryKey: ["admin", "broker-applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: () => toast.error(t("_authenticatedAdminBroker-applications.k13")),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminPhase04Api.verifyBroker(id, "rejected", reason),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminBroker-applications.k14"));
      setRejecting(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin", "broker-applications"] });
      qc.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: () => toast.error(t("_authenticatedAdminBroker-applications.k15")),
  });

  if (isLoading)
    return (
      <PortalShell title={t("_authenticatedAdminBroker-applications.k2")}>
        <Spinner />
      </PortalShell>
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = unwrapRows(data) as any[];

  return (
    <PortalShell title={t("_authenticatedAdminBroker-applications.k3")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() =>
              navigate({
                to: "/admin/broker-applications",
                search: t.value ? { status: t.value } : {},
              })
            }
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              activeTab === t.value
                ? "bg-gold-gradient text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="relative me-auto">
          <Search className="absolute top-1/2 start-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearchInput(search.trim());
            }}
            placeholder={t("_authenticatedAdminBroker-applications.k4")}
            className="w-64 rounded-full border border-input bg-card py-2 pe-8 ps-4 text-sm outline-none focus:border-gold max-sm:w-full"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("_authenticatedAdminBroker-applications.k5")}
          description={t("_authenticatedAdminBroker-applications.k6")}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => {
            const isActionable = b.verificationStatus !== "verified";
            return (
              <div key={b.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <Link
                    to="/admin/brokers/$id"
                    params={{ id: b.id }}
                    className="font-semibold text-foreground hover:text-gold"
                  >
                    {b.displayName}
                  </Link>
                  {b.user?.email ? (
                    <p className="num mt-0.5 text-sm text-muted-foreground">{b.user.email}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {b.user?.phone || b.phone ? (
                      <span className="num">{b.user?.phone || b.phone}</span>
                    ) : (
                      t("_authenticatedAdminBroker-applications.k16")
                    )}{" "}
                    {t("_authenticatedAdminBroker-applications.k10000")}{" "}
                    <span className="num">{fmtDate(b.createdAt)}</span> •
                    {t("_authenticatedAdminBroker-applications.k10001")}{" "}
                    <span className="num">{b.documentsCount ?? 0}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.verificationStatus} />
                    {b.isActive === false && <StatusBadge status="deactivated" />}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <Link
                    to="/admin/brokers/$id"
                    params={{ id: b.id }}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-gold/15 hover:text-gold"
                  >
                    <FileText className="inline h-3.5 w-3.5" />{" "}
                    {t("_authenticatedAdminBroker-applications.k10002")}
                  </Link>
                  {isActionable && (
                    <>
                      <button
                        className="rounded-lg bg-gold-gradient px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(b.id)}
                      >
                        {t("_authenticatedAdminBroker-applications.k10000")}
                      </button>
                      <button
                        className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive"
                        onClick={() => {
                          setRejecting({ id: b.id, name: b.displayName });
                          setRejectReason("");
                        }}
                      >
                        {t("_authenticatedAdminBroker-applications.k10001")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-luxe w-full max-w-md p-6">
            <h3 className="text-lg font-bold">{t("_authenticatedAdminBroker-applications.k1")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("_authenticatedAdminBroker-applications.k10003")}{" "}
              <span className="font-bold text-foreground">{rejecting.name}</span>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:border-gold"
              placeholder={t("_authenticatedAdminBroker-applications.k7")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground"
                onClick={() => {
                  setRejecting(null);
                  setRejectReason("");
                }}
              >
                {t("_authenticatedAdminBroker-applications.k10002")}
              </button>
              <button
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() => reject.mutate({ id: rejecting.id, reason: rejectReason.trim() })}
              >
                {reject.isPending
                  ? t("_authenticatedAdminBroker-applications.k17")
                  : t("_authenticatedAdminBroker-applications.k18")}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
