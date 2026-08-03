import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatsCard } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { profileApi } from "@/api/profile.api";
import { fmtUSD, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profits")({
  component: ProfitsPage,
});

function ProfitsPage() {
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["profit-payouts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.profitDistributions();
      const raw = res.data?.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];
      return items as Array<{
        id: string;
        distributionId: string;
        holdingId: string;
        ownershipPercent: number;
        payoutUsd: number;
        payoutSak: number;
        status: "pending" | "completed" | "failed";
        createdAt: string;
      }>;
    },
  });

  const totalReceivedUsd = payouts?.reduce((sum, p) => sum + p.payoutUsd, 0) ?? 0;
  const totalReceivedSak = payouts?.reduce((sum, p) => sum + p.payoutSak, 0) ?? 0;
  const completedCount = payouts?.filter((p) => p.status === "completed").length ?? 0;

  return (
    <PortalShell title="العوائد">
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatsCard
              title="إجمالي العوائد (USD)"
              value={`$${totalReceivedUsd.toFixed(2)}`}
              icon={TrendingUp}
              variant="gold"
            />
            <StatsCard
              title="إجمالي العوائد (SAK)"
              value={totalReceivedSak.toFixed(2)}
              icon={TrendingUp}
              variant="success"
            />
            <StatsCard
              title="التوزيعات المكتملة"
              value={completedCount.toString()}
              icon={TrendingUp}
              variant="info"
            />
          </div>

          {!payouts?.length ? (
            <EmptyState
              icon={TrendingUp}
              title="لا توجد عوائد بعد"
              description="سيظهر هنا تاريخ توزيع الأرباح الخاصة بك"
            />
          ) : (
            <div className="card-luxe overflow-x-auto !p-0">
              <table className="w-full min-w-160 text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-right">
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">العقار</th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">نسبة الملكية</th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">العائد (USD)</th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">العائد (SAK)</th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">الحالة</th>
                    <th className="px-5 py-3.5 text-xs font-medium text-muted-foreground">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-5 py-3.5 text-muted-foreground">—</td>
                      <td className="num px-5 py-3.5">{p.ownershipPercent.toFixed(2)}%</td>
                      <td className="num px-5 py-3.5 font-medium text-gold">
                        ${p.payoutUsd.toFixed(2)}
                      </td>
                      <td className="num px-5 py-3.5">{p.payoutSak.toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            p.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : p.status === "failed"
                                ? "bg-red-500/15 text-red-400"
                                : "bg-yellow-500/15 text-yellow-400"
                          }`}
                        >
                          {p.status === "completed"
                            ? "مكتمل"
                            : p.status === "failed"
                              ? "فشل"
                              : "قيد الانتظار"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {fmtDateTime(p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
