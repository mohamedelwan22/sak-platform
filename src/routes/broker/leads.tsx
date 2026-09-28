import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { leadsApi, unwrapRows } from "@/api/phase04.api";
import { Users } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/leads")({
  ssr: false,
  component: BrokerLeads,
});

function BrokerLeads() {
  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list({ limit: 100 }),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerLeads.k1")}>
        <Spinner />
      </PortalShell>
    );

  const rows = unwrapRows(data);

  return (
    <PortalShell title={t("brokerLeads.k2")}>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={t("brokerLeads.k3")} description={t("brokerLeads.k4")} />
      ) : (
        <div className="space-y-3">
          {rows.map((lead) => (
            <Link
              key={lead.id}
              to="/broker/leads/$leadId"
              params={{ leadId: lead.id }}
              className="card-luxe block p-4 transition hover:border-gold/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{lead.contactName ?? t("brokerLeads.k5")}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.contactPhone ?? lead.clientId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={lead.status} />
                  <span className="text-xs text-muted-foreground">{lead.source}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
