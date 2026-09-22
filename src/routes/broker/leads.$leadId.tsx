import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { leadsApi } from "@/api/phase04.api";

export const Route = createFileRoute("/broker/leads/$leadId")({
  ssr: false,
  component: LeadDetail,
});

function LeadDetail() {
  const { leadId } = useParams({ from: "/broker/leads/$leadId" });
  const { data, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadsApi.get(leadId),
  });

  if (isLoading)
    return (
      <PortalShell title="تفاصيل العميل المحتمل">
        <Spinner />
      </PortalShell>
    );

  const lead = data?.data?.data;

  if (!lead)
    return (
      <PortalShell title="تفاصيل العميل المحتمل">
        <p>غير موجود</p>
      </PortalShell>
    );

  return (
    <PortalShell title="تفاصيل العميل المحتمل">
      <div className="card-luxe space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{lead.contactName ?? "بدون اسم"}</h2>
          <StatusBadge status={lead.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">الهاتف</dt>
            <dd className="font-semibold">{lead.contactPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">المصدر</dt>
            <dd className="font-semibold">{lead.source}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">الأصل</dt>
            <dd className="font-semibold">{lead.land?.titleAr ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">الوسيط</dt>
            <dd className="font-semibold">{lead.broker?.displayName ?? "غير مسند"}</dd>
          </div>
        </dl>
        {lead.notes && <p className="rounded-xl bg-secondary/60 p-4 text-sm">{lead.notes}</p>}
      </div>
    </PortalShell>
  );
}
