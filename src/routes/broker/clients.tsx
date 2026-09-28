import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { brokerApi, unwrapRows } from "@/api/phase04.api";
import { Users } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker/clients")({
  ssr: false,
  component: BrokerClients,
});

function BrokerClients() {
  const { data: me } = useQuery({ queryKey: ["broker", "me"], queryFn: () => brokerApi.me() });
  const brokerId = (me?.data?.data?.id ?? "") as string;
  const { data, isLoading } = useQuery({
    queryKey: ["broker", "clients", brokerId],
    queryFn: async () => {
      if (!brokerId) return { data: { data: [] } };
      const res = await import("@/api/client").then((m) =>
        m.apiClient.get(`/brokers/${brokerId}/clients`),
      );
      return res;
    },
    enabled: Boolean(brokerId),
  });

  if (isLoading)
    return (
      <PortalShell title={t("brokerClients.k1")}>
        <Spinner />
      </PortalShell>
    );

  const clients = unwrapRows(data);

  return (
    <PortalShell title={t("brokerClients.k2")}>
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("brokerClients.k3")}
          description={t("brokerClients.k4")}
        />
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {clients.map((c: any) => (
            <div key={c.id} className="card-luxe flex items-center justify-between p-4">
              <div>
                <p className="font-semibold">
                  {c.firstName} {c.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{c.email}</p>
              </div>
              <Link to="/broker/leads" className="text-sm text-gold">
                {t("brokerClients.k10000")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
