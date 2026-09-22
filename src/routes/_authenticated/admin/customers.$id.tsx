import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminDataApi } from "@/api/admin-data.api";

export const Route = createFileRoute("/_authenticated/admin/customers/$id")({
  ssr: false,
  component: AdminCustomerDetail,
});

function AdminCustomerDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/customers/$id" });
  const { data: holdings } = useQuery({
    queryKey: ["admin", "customer", "holdings", id],
    queryFn: () => adminDataApi.holdingsSummary(),
  });

  if (!id)
    return (
      <PortalShell title="تفاصيل العميل">
        <p>غير موجود</p>
      </PortalShell>
    );

  const summary = holdings?.data?.data;

  return (
    <PortalShell title="تفاصيل العميل">
      <div className="card-luxe space-y-4 p-6">
        <h2 className="text-xl font-bold">العميل {id}</h2>
        {summary && (
          <div className="flex flex-wrap gap-4">
            <div className="rounded-xl bg-secondary/60 p-4 text-sm">
              عدد الأصول: {Array.isArray(summary) ? summary.length : 0}
            </div>
          </div>
        )}
        <StatusBadge status="active" label="عرض من لوحة العملاء" />
      </div>
    </PortalShell>
  );
}
