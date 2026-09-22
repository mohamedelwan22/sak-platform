import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { brokerApi, unwrapRows } from "@/api/phase04.api";
import { Users } from "lucide-react";

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
      <PortalShell title="العملاء">
        <Spinner />
      </PortalShell>
    );

  const clients = unwrapRows(data);

  return (
    <PortalShell title="العملاء">
      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء"
          description="سيظهر هنا العملاء المرتبطون بملفك كوسيط."
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
                العملاء المحتملون
              </Link>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
