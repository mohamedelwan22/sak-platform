import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import {
  adminListGoldPrices,
  adminCreateGoldPrice,
  adminDeleteGoldPrice,
  adminGoldStatistics,
} from "@/lib/admin.functions";
import { fmtUSD, fmtDateTime } from "@/lib/format";
import { goldQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/gold")({
  component: AdminGoldPage,
});

type GoldForm = {
  gram_price_usd: number;
  source: string;
};

const emptyForm: GoldForm = {
  gram_price_usd: 0,
  source: "manual",
};

const PAGE_SIZE = 15;

function AdminGoldPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GoldForm | null>(null);
  const [page, setPage] = useState(1);

  const { data: goldPrice } = useQuery(goldQuery);

  const { data: prices, isLoading } = useQuery({
    queryKey: ["admin-gold-prices", page],
    queryFn: () => adminListGoldPrices({ page, limit: PAGE_SIZE }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-gold-statistics"],
    queryFn: () => adminGoldStatistics(),
  });

  const create = useMutation({
    mutationFn: (f: GoldForm) =>
      adminCreateGoldPrice({
        gram_price_usd: Number(f.gram_price_usd),
        source: f.source || "manual",
      }),
    onSuccess: () => {
      toast.success("تم تسجيل السعر");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-gold-prices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gold-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["gold-price"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteGoldPrice(id),
    onSuccess: () => {
      toast.success("تم حذف السجل");
      queryClient.invalidateQueries({ queryKey: ["admin-gold-prices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-gold-statistics"] });
      queryClient.invalidateQueries({ queryKey: ["gold-price"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = stats as Record<string, unknown> | undefined;
  const totalPages = prices?.totalPages ?? 1;

  return (
    <PortalShell title="إدارة أسعار الذهب">
      {goldPrice && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <p className="mb-2 text-sm text-muted-foreground">السعر الحالي للذهب (جرام)</p>
          <p className="text-3xl font-bold text-gold">
            {fmtUSD(Number(goldPrice.gram_price_usd ?? goldPrice.gram_price_usd))}
          </p>
        </div>
      )}

      {!statsLoading && stat && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="أعلى سعر"
            value={stat.max != null ? fmtUSD(Number(stat.max)) : "—"}
          />
          <StatCard
            label="أدنى سعر"
            value={stat.min != null ? fmtUSD(Number(stat.min)) : "—"}
          />
          <StatCard
            label="متوسط السعر"
            value={stat.avg != null ? fmtUSD(Number(stat.avg)) : "—"}
          />
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setForm(form ? null : emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {form ? "إلغاء" : "+ تسجيل سعر جديد"}
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">تسجيل سعر جديد</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="سعر الجرام (دولار)">
              <input
                type="number"
                step="0.01"
                value={form.gram_price_usd || ""}
                onChange={(e) => setForm({ ...form, gram_price_usd: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="المصدر">
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inp}
                placeholder="manual"
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => create.mutate(form)}
              disabled={create.isPending || !form.gram_price_usd || form.gram_price_usd <= 0}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !prices?.data?.length ? (
        <EmptyState title="لا أسعار بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">التاريخ</th>
                <th className="px-5 py-3.5 font-semibold">سعر الجرام (USD)</th>
                <th className="px-5 py-3.5 font-semibold">المصدر</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {prices.data.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 text-muted-foreground">{fmtDateTime(p.created_at)}</td>
                  <td className="num px-5 py-3.5 font-semibold text-gold">
                    {fmtUSD(Number(p.gram_price_usd))}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.source}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا السجل؟")) remove.mutate(p.id);
                      }}
                      className="text-xs font-bold text-destructive hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </PortalShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-luxe p-4">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

const inp =
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
