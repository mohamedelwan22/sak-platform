import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminListInvestors } from "@/lib/admin.functions";
import { fmtDate, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/investors")({
  component: AdminInvestorsPage,
});

function AdminInvestorsPage() {
  const listFn = useServerFn(adminListInvestors);
  const { data: rows, isLoading } = useQuery({ queryKey: ["admin-investors"], queryFn: () => listFn() });

  return (
    <PortalShell title="المستثمرون">
      {isLoading ? (
        <Spinner />
      ) : !rows?.length ? (
        <EmptyState title="لا مستثمرين بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">الاسم</th>
                <th className="px-5 py-3.5 font-semibold">البريد</th>
                <th className="px-5 py-3.5 font-semibold">KYC</th>
                <th className="px-5 py-3.5 font-semibold">رصيد SAK</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ التسجيل</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{p.full_name || "—"}</td>
                  <td className="num px-5 py-3.5 text-muted-foreground">{p.email}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.kyc_status} /></td>
                  <td className="num px-5 py-3.5 font-bold text-gold">{fmtNum(p.sak_balance, 2)}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{fmtDate(p.created_at)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.account_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}
