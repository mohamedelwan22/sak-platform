import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { leadsApi } from "@/api/phase04.api";
import { t } from "@/i18n";

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
      <PortalShell title={t("brokerLeadsleadId.k6")}>
        <Spinner />
      </PortalShell>
    );

  const lead = data?.data?.data;

  if (!lead)
    return (
      <PortalShell title={t("brokerLeadsleadId.k7")}>
        <p>{t("brokerLeadsleadId.k1")}</p>
      </PortalShell>
    );

  return (
    <PortalShell title={t("brokerLeadsleadId.k8")}>
      <div className="card-luxe space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{lead.contactName ?? t("brokerLeadsleadId.k9")}</h2>
          <StatusBadge status={lead.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("brokerLeadsleadId.k2")}</dt>
            <dd className="font-semibold">{lead.contactPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("brokerLeadsleadId.k3")}</dt>
            <dd className="font-semibold">{lead.source}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("brokerLeadsleadId.k4")}</dt>
            <dd className="font-semibold">{lead.land?.titleAr ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("brokerLeadsleadId.k5")}</dt>
            <dd className="font-semibold">
              {lead.broker?.displayName ?? t("brokerLeadsleadId.k10")}
            </dd>
          </div>
        </dl>
        {lead.notes && <p className="rounded-xl bg-secondary/60 p-4 text-sm">{lead.notes}</p>}
      </div>
    </PortalShell>
  );
}
