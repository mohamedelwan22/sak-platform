import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatsCard } from "@/components/shared/ui-kit";
import { leadsApi, viewingsApi, bookingsApi, unwrapRows } from "@/api/phase04.api";
import { Users, CalendarClock, Store, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/broker/analytics")({
  ssr: false,
  component: BrokerAnalytics,
});

const CONVERTED = ["converted", "booked", "closed"];

function BrokerAnalytics() {
  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadsApi.list({ limit: 500 }),
  });
  const { data: viewings } = useQuery({
    queryKey: ["viewings"],
    queryFn: () => viewingsApi.list({ limit: 500 }),
  });
  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingsApi.list({ limit: 500 }),
  });

  const leadsRows = unwrapRows(leads);
  const viewingsRows = unwrapRows(viewings);
  const bookingsRows = unwrapRows(bookings);

  const converted = leadsRows.filter((l) => CONVERTED.includes(l.status)).length;
  const conversionRate = leadsRows.length ? ((converted / leadsRows.length) * 100).toFixed(1) : "0";

  return (
    <PortalShell title="التحليلات والأداء">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="إجمالي العملاء المحتملين" value={String(leadsRows.length)} icon={Users} />
        <StatsCard
          title="المُحوّلون"
          value={String(converted)}
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="معدل التحويل"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          variant="gold"
        />
        <StatsCard
          title="معاينات / حجوزات"
          value={`${viewingsRows.length} / ${bookingsRows.length}`}
          icon={CalendarClock}
          variant="info"
        />
      </div>

      {leadsRows.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={Store}
            title="لا توجد بيانات كافية بعد"
            description="ستتحدث التحليلات مع نمو العملاء المحتملين."
          />
        </div>
      )}
    </PortalShell>
  );
}
