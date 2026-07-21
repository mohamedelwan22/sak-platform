import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtUSD, fmtNum, fmtDateTime } from "@/lib/format";
import { txLabel } from "@/routes/_authenticated/dashboard";
import { profileApi } from "@/api/profile.api";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions-all", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.transactions();
      return res.data.data;
    },
  });

  return (
    <PortalShell title="المعاملات">
      {isLoading ? (
        <Spinner />
      ) : !Array.isArray(transactions) || !transactions.length ? (
        <EmptyState
          icon={ReceiptText}
          title="لا معاملات بعد"
          description="ستظهر هنا كل حركات محفظتك المالية"
        />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">النوع</th>
                <th className="px-5 py-3.5 font-semibold">SAK</th>
                <th className="px-5 py-3.5 font-semibold">USD</th>
                <th className="px-5 py-3.5 font-semibold">سعر SAK وقتها</th>
                <th className="px-5 py-3.5 font-semibold">التاريخ</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(
                (t: {
                  id: string;
                  type: string;
                  direction: string;
                  sak_amount: string | number;
                  usd_amount: string | number;
                  sak_price_at_time?: string | number | null;
                  created_at: string;
                  status: string;
                }) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/40"
                  >
                    <td className="px-5 py-3.5 font-semibold text-foreground">{txLabel(t.type)}</td>
                    <td
                      className={`num px-5 py-3.5 font-bold ${t.direction === "credit" ? "text-success" : "text-destructive"}`}
                    >
                      {t.direction === "credit" ? "+" : "−"}
                      {fmtNum(Number(t.sak_amount), 2)}
                    </td>
                    <td className="num px-5 py-3.5 text-muted-foreground">
                      {fmtUSD(Number(t.usd_amount))}
                    </td>
                    <td className="num px-5 py-3.5 text-muted-foreground">
                      {t.sak_price_at_time ? fmtUSD(Number(t.sak_price_at_time)) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {fmtDateTime(t.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
