import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ReceiptText, Search, X } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtUSD, fmtNum, fmtDateTime } from "@/lib/format";
import { txLabel } from "@/routes/_authenticated/dashboard";
import { profileApi } from "@/api/profile.api";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

const TYPES: Array<{ key: string; label: string }> = [
  { key: "buy", label: "شراء SAK" },
  { key: "sell", label: "بيع SAK" },
  { key: "deposit", label: "إيداع" },
  { key: "withdrawal", label: "سحب" },
  { key: "transfer_in", label: "تحويل وارد" },
  { key: "transfer_out", label: "تحويل صادر" },
  { key: "adjustment", label: "تسوية" },
  { key: "profit_distribution", label: "توزيع أرباح" },
];

const DIRECTIONS: Array<{ key: string; label: string }> = [
  { key: "credit", label: "إيداع (+) في الرصيد" },
  { key: "debit", label: "خصم (−) من الرصيد" },
];

const STATUSES: Array<{ key: string; label: string }> = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "completed", label: "مكتمل" },
  { key: "failed", label: "فشل" },
  { key: "cancelled", label: "ملغي" },
];

function TransactionsPage() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<Record<string, string>>({});

  const hasFilter = Boolean(
    applied.type || applied.direction || applied.status || applied.from || applied.to,
  );

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions-all", userId, applied],
    enabled: !!userId,
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (applied.type) params.type = applied.type;
      if (applied.direction) params.direction = applied.direction;
      if (applied.status) params.status = applied.status;
      if (applied.from) params.from = new Date(applied.from + "T00:00:00").toISOString();
      if (applied.to) params.to = new Date(applied.to + "T23:59:59").toISOString();
      const res = await profileApi.transactions(params);
      return res.data.data;
    },
  });

  const items = Array.isArray(transactions) ? transactions : [];

  function applyFilters() {
    setApplied({
      ...(type ? { type } : {}),
      ...(direction ? { direction } : {}),
      ...(status ? { status } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
  }

  function clearFilters() {
    setType("");
    setDirection("");
    setStatus("");
    setFrom("");
    setTo("");
    setApplied({});
  }

  return (
    <PortalShell title="المعاملات">
      <div className="card-luxe mb-6 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">النوع</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="">الكل</option>
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              الاتجاه
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="">الكل</option>
              {DIRECTIONS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">الحالة</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="">الكل</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              من تاريخ
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyFilters}
            className="bg-gold-gradient flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            <Search className="h-4 w-4" /> تطبيق الفلترة
          </button>
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" /> مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !items.length ? (
        <EmptyState
          icon={ReceiptText}
          title={hasFilter ? "لا توجد معاملات مطابقة" : "لا معاملات بعد"}
          description={
            hasFilter
              ? "جرّب تعديل الفلاتر أو مسحها لعرض جميع المعاملات."
              : "ستظهر هنا كل حركات محفظتك المالية."
          }
        />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-180 text-sm">
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
              {items.map(
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
          {hasFilter && (
            <p className="px-5 py-3 text-xs text-muted-foreground">
              عرض {items.length} معاملة حسب الفلاتر المطبقة.
            </p>
          )}
        </div>
      )}
    </PortalShell>
  );
}
