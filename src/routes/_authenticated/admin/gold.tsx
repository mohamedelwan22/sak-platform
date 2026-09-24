import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert, Activity } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import {
  adminListGoldPrices,
  adminCreateGoldPrice,
  adminDeleteGoldPrice,
  adminGoldStatistics,
  adminMarketStatus,
  adminMarketRefresh,
  adminMarketOverride,
} from "@/lib/admin.functions";
import { fmtUSD, fmtDateTime, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/gold")({
  component: AdminGoldPage,
});

type GoldForm = {
  gram_price_usd: number;
  source: string;
};

type OverrideForm = {
  price_per_ounce: number;
  reason: string;
};

const emptyForm: GoldForm = {
  gram_price_usd: 0,
  source: "manual",
};

const emptyOverride: OverrideForm = {
  price_per_ounce: 0,
  reason: "",
};

const PAGE_SIZE = 15;

function AdminGoldPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GoldForm | null>(null);
  const [overrideForm, setOverrideForm] = useState<OverrideForm | null>(null);
  const [page, setPage] = useState(1);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["admin-market-status"],
    queryFn: () => adminMarketStatus(),
    refetchInterval: 30_000,
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: ["admin-gold-prices", page],
    queryFn: () => adminListGoldPrices({ page, limit: PAGE_SIZE }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-gold-statistics"],
    queryFn: () => adminGoldStatistics(),
  });

  const invalidateMarket = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-market-status"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gold-prices"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gold-statistics"] });
    queryClient.invalidateQueries({ queryKey: ["market-gold"] });
    queryClient.invalidateQueries({ queryKey: ["market-sak-price"] });
    queryClient.invalidateQueries({ queryKey: ["gold-price"] });
  };

  const refresh = useMutation({
    mutationFn: () => adminMarketRefresh(),
    onSuccess: () => {
      toast.success("تم تحديث السعر من المزوّد");
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const override = useMutation({
    mutationFn: (f: OverrideForm) =>
      adminMarketOverride({ pricePerOunce: f.price_per_ounce, reason: f.reason }),
    onSuccess: () => {
      toast.success("تم تطبيق التسعير اليدوي — تم تسجيل العملية في سجل التدقيق");
      setOverrideForm(null);
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
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
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteGoldPrice(id),
    onSuccess: () => {
      toast.success("تم حذف السجل");
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = stats as Record<string, unknown> | undefined;
  const totalPages = prices?.totalPages ?? 1;
  const provider = status?.provider;

  return (
    <PortalShell title="إدارة أسعار الذهب والسوق">
      {/* Live provider + cache status */}
      <div className="card-luxe gold-ring mb-8 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Activity className="h-4 w-4 text-gold" />
            حالة مزوّد التسعير المباشر
          </h2>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex items-center gap-2 rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
            {refresh.isPending ? "جارٍ التحديث…" : "تحديث يدوي"}
          </button>
        </div>

        {statusLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatusBox
              label="سعر الأونصة الحالي"
              value={status?.price ? fmtUSD(Number(status.price.gold.pricePerOunce)) : "غير متوفر"}
              hint={
                status?.price
                  ? fmtUSD(Number(status.price.gold.pricePerGram)) + " / جرام"
                  : undefined
              }
            />
            <StatusBox
              label="حالة الكاش"
              value={provider?.cache.active ? "نشط" : "منتهي"}
              hint={
                provider?.cache.active
                  ? `ينتهي خلال ${provider.cache.secondsUntilExpiry} ثانية`
                  : "سيُجلب سعر جديد عند الطلب التالي"
              }
              tone={provider?.cache.active ? "success" : "muted"}
            />
            <StatusBox
              label="آخر تحديث ناجح"
              value={provider?.lastSuccessAt ? fmtDateTime(provider.lastSuccessAt) : "—"}
              hint={
                status?.price
                  ? `المصدر: ${status.price.source}${status.price.isStale ? " (غير مباشر)" : ""}`
                  : undefined
              }
            />
            <StatusBox
              label="آخر خطأ"
              value={provider?.lastError ? "فشل الاتصال بالمزوّد" : "لا يوجد"}
              hint={provider?.lastErrorAt ? fmtDateTime(provider.lastErrorAt) : undefined}
              tone={provider?.lastError ? "danger" : "muted"}
            />
          </div>
        )}
      </div>

      {!statsLoading && stat && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="أعلى سعر" value={stat.max != null ? fmtUSD(Number(stat.max)) : "—"} />
          <StatCard label="أدنى سعر" value={stat.min != null ? fmtUSD(Number(stat.min)) : "—"} />
          <StatCard label="متوسط السعر" value={stat.avg != null ? fmtUSD(Number(stat.avg)) : "—"} />
        </div>
      )}

      <div className="mb-6 flex justify-end gap-3">
        <button
          onClick={() => setOverrideForm(overrideForm ? null : { ...emptyOverride })}
          className="flex items-center gap-2 rounded-lg border border-amber-500/50 px-5 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/10"
        >
          <ShieldAlert className="h-4 w-4" />
          تسعير يدوي (Override)
        </button>
        <button
          onClick={() => setForm(form ? null : emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {form ? "إلغاء" : "+ تسجيل سعر جديد"}
        </button>
      </div>

      {/* Manual override — audited, reason required */}
      {overrideForm && (
        <div className="card-luxe mb-8 border-amber-500/30 p-6">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            تسعير يدوي طارئ
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">
            يُستخدم فقط عند تعطل مزوّد التسعير. يجب إدخال سعر الأونصة بالدولار مع سبب واضح — يُسجَّل
            التغيير (القيمة القديمة والجديدة والسبب والمستخدم) في سجل التدقيق ويُعلَّم السعر بوسم
            MANUAL_OVERRIDE.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="سعر الأونصة (USD)">
              <input
                type="number"
                step="0.01"
                value={overrideForm.price_per_ounce || ""}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, price_per_ounce: Number(e.target.value) })
                }
                className={`num ${inp}`}
              />
            </Field>
            <Field label="السبب (10 أحرف على الأقل)">
              <input
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                className={inp}
                placeholder="مثال: تعطل مزوّد التسعير أثناء الصيانة"
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => override.mutate(overrideForm)}
              disabled={
                override.isPending ||
                !overrideForm.price_per_ounce ||
                overrideForm.price_per_ounce <= 0 ||
                overrideForm.reason.trim().length < 10
              }
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {override.isPending ? "جارٍ التطبيق…" : "تطبيق التسعير اليدوي"}
            </button>
            <button
              onClick={() => setOverrideForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

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
                <th className="px-5 py-3.5 font-semibold">وقت الجلب</th>
                <th className="px-5 py-3.5 font-semibold">سعر الأونصة (USD)</th>
                <th className="px-5 py-3.5 font-semibold">سعر الجرام (USD)</th>
                <th className="px-5 py-3.5 font-semibold">المصدر</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {prices.data.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 text-muted-foreground">{fmtDateTime(p.fetched_at)}</td>
                  <td className="num px-5 py-3.5 font-semibold text-gold">
                    {fmtUSD(Number(p.price_per_ounce))}
                  </td>
                  <td className="num px-5 py-3.5 font-semibold text-foreground">
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
            صفحة {fmtNum(page)} / {fmtNum(totalPages)}
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

function StatusBox({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-gold";
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
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
