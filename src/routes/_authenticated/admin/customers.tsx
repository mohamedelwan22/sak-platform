import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminPhase04Api, unwrapRows } from "@/api/phase04.api";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  ssr: false,
  component: AdminCustomers,
});

function AdminCustomers() {
  const { pathname } = useLocation();
  const isDetail = pathname !== "/admin/customers" && pathname.startsWith("/admin/customers/");
  if (isDetail) return <Outlet />;
  return <CustomersList />;
}

function CustomersList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: () => adminPhase04Api.customers({ limit: 100 }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminPhase04Api.updateCustomerStatus(id, status),
    onSuccess: () => {
      toast.success("تم تحديث حالة العميل");
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: () => toast.error("تعذر التحديث"),
  });

  if (isLoading)
    return (
      <PortalShell title="إدارة العملاء">
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title="إدارة العملاء">
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="لا يوجد عملاء" />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div
              key={c.id}
              className="card-luxe flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <Link
                  to="/admin/customers/$id"
                  params={{ id: c.id }}
                  className="font-semibold hover:text-gold"
                >
                  {c.firstName} {c.lastName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {c.email} • {c.accountNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status === "active" && (
                  <button
                    className="rounded-lg bg-destructive/15 px-3 py-1.5 text-sm font-bold text-destructive"
                    onClick={() => updateStatus.mutate({ id: c.id, status: "suspended" })}
                  >
                    إيقاف
                  </button>
                )}
                {(c.status === "suspended" || c.status === "inactive") && (
                  <button
                    className="rounded-lg bg-gold-gradient px-3 py-1.5 text-sm font-bold text-primary-foreground"
                    onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
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
