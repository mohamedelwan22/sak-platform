import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { Users, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/brokers")({
  ssr: false,
  component: AdminBrokers,
});

function fmtDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

// /admin/brokers is a file-based layout whose child is /admin/brokers/$id.
// When a detail child is matched, render it; otherwise render the approved list.
function AdminBrokers() {
  const { pathname } = useLocation();
  const isDetail = pathname.startsWith("/admin/brokers/") && pathname !== "/admin/brokers";
  if (isDetail) return <Outlet />;
  return <ApprovedBrokersList />;
}

function ApprovedBrokersList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "brokers"],
    queryFn: () => adminPhase04Api.brokers({ verificationStatus: "verified", limit: 100 }),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => adminPhase04Api.deactivateBroker(id),
    onSuccess: () => {
      toast.success("تم تعطيل الوسيط");
      qc.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: () => toast.error("تعذر تعطيل الوسيط"),
  });

  const activate = useMutation({
    mutationFn: (id: string) => adminPhase04Api.activateBroker(id),
    onSuccess: () => {
      toast.success("تم إعادة تفعيل الوسيط");
      qc.invalidateQueries({ queryKey: ["admin", "brokers"] });
    },
    onError: () => toast.error("تعذر إعادة التفعيل"),
  });

  if (isLoading)
    return (
      <PortalShell title="الوسطاء المعتمدون">
        <Spinner />
      </PortalShell>
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = unwrapRows(data) as any[];
  const suspendedCount = rows.filter((r) => !r.isActive).length;

  return (
    <PortalShell title="الوسطاء المعتمدون">
      <p className="mb-4 text-sm text-muted-foreground">
        الوسطاء المعتمدون فقط{suspendedCount > 0 ? ` — ${suspendedCount} موقوف` : ""}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد وسطاء معتمدون" />
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="card-luxe grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <Link
                  to="/admin/brokers/$id"
                  params={{ id: b.id }}
                  className="font-semibold hover:text-gold"
                >
                  <UserCheck className="inline h-4 w-4 text-gold" /> {b.displayName}
                </Link>
                <p className="num mt-0.5 text-sm text-muted-foreground">{b.user?.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {b.company ? <>{b.company} • </> : null}
                  تاريخ الاعتماد: <span className="num">{fmtDate(b.verifiedAt)}</span> • التسجيل:{" "}
                  <span className="num">{fmtDate(b.createdAt)}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status="verified" />
                  {b.isActive === false && <StatusBadge status="deactivated" />}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <Link
                  to="/admin/brokers/$id"
                  params={{ id: b.id }}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-gold/15 hover:text-gold"
                >
                  تفاصيل
                </Link>
                {b.isActive ? (
                  <button
                    className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive"
                    disabled={deactivate.isPending}
                    onClick={() => deactivate.mutate(b.id)}
                  >
                    تعطيل
                  </button>
                ) : (
                  <button
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold"
                    disabled={activate.isPending}
                    onClick={() => activate.mutate(b.id)}
                  >
                    تفعيل
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
