import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import {
  adminListSakConfigs,
  adminSaveSakConfig,
  adminDeleteSakConfig,
} from "@/lib/admin.functions";
import { fmtUSD, fmtDateTime } from "@/lib/format";
import { goldQuery, sakPrice } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/sak-config")({
  component: AdminSakConfigPage,
});

type SakConfigForm = {
  id?: string;
  sak_to_gold_ratio: number;
  sell_fee_percent: number;
  effective_from: string;
};

const emptyForm: SakConfigForm = {
  sak_to_gold_ratio: 1,
  sell_fee_percent: 2,
  effective_from: new Date().toISOString().slice(0, 16),
};

function AdminSakConfigPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SakConfigForm | null>(null);

  const { data: goldPrice } = useQuery(goldQuery);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin-sak-configs"],
    queryFn: () => adminListSakConfigs(),
  });

  const save = useMutation({
    mutationFn: (f: SakConfigForm) =>
      adminSaveSakConfig({
        id: f.id,
        sak_to_gold_ratio: Number(f.sak_to_gold_ratio),
        sell_fee_percent: Number(f.sell_fee_percent),
        effective_from: new Date(f.effective_from).toISOString(),
      }),
    onSuccess: () => {
      toast.success("تم حفظ الإعداد بنجاح");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-sak-configs"] });
      queryClient.invalidateQueries({ queryKey: ["sak-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteSakConfig(id),
    onSuccess: () => {
      toast.success("تم حذف الإعداد");
      queryClient.invalidateQueries({ queryKey: ["admin-sak-configs"] });
      queryClient.invalidateQueries({ queryKey: ["sak-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = configs ?? [];
  const latest = list[0] ?? null;
  const canDelete = (id: string) => list.length > 1 && list[list.length - 1].id !== id;

  const currentRatio = latest ? Number(latest.sak_to_gold_ratio) : null;
  const currentSakPrice = sakPrice(
    goldPrice,
    latest ? { sak_to_gold_ratio: Number(latest.sak_to_gold_ratio) } : null,
  );

  return (
    <PortalShell title="إعدادات محرك SAK">
      {latest && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <p className="mb-3 text-sm text-muted-foreground">الإعداد الحالي</p>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">نسبة SAK إلى الذهب</p>
              <p className="text-lg font-bold text-foreground">
                {Number(latest.sak_to_gold_ratio)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">رسوم البيع %</p>
              <p className="text-lg font-bold text-foreground">
                {Number(latest.sell_fee_percent)}%
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">تاريخ السريان</p>
              <p className="text-sm font-bold text-foreground">
                {fmtDateTime(latest.effective_from)}
              </p>
            </div>
          </div>
        </div>
      )}

      {currentSakPrice !== null && (
        <div className="card-luxe mb-8 p-6">
          <p className="mb-2 text-sm text-muted-foreground">حاسبة سعر SAK = سعر الذهب × النسبة</p>
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-muted-foreground">
              ({fmtUSD(Number(goldPrice?.gram_price_usd))} × {currentRatio})
            </span>
            <span className="text-2xl font-bold text-gold">{fmtUSD(currentSakPrice)}</span>
            <span className="text-sm text-muted-foreground">/ وحدة SAK</span>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setForm(form ? null : emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {form ? "إلغاء" : "+ إعداد جديد"}
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id ? "تعديل إعداد" : "إعداد جديد"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="نسبة SAK إلى الذهب">
              <input
                type="number"
                step="0.01"
                value={form.sak_to_gold_ratio || ""}
                onChange={(e) => setForm({ ...form, sak_to_gold_ratio: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="رسوم البيع %">
              <input
                type="number"
                step="0.01"
                value={form.sell_fee_percent || ""}
                onChange={(e) => setForm({ ...form, sell_fee_percent: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="تاريخ السريان">
              <input
                type="datetime-local"
                value={form.effective_from}
                onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                className={inp}
                dir="ltr"
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => save.mutate(form)}
              disabled={
                save.isPending ||
                !form.sak_to_gold_ratio ||
                form.sak_to_gold_ratio <= 0 ||
                form.sell_fee_percent < 0 ||
                form.sell_fee_percent > 100 ||
                !form.effective_from
              }
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
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
      ) : !list.length ? (
        <EmptyState title="لا إعدادات بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-140 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">النسبة (SAK/ذهب)</th>
                <th className="px-5 py-3.5 font-semibold">رسوم البيع %</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ السريان</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ الإنشاء</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {Number(c.sak_to_gold_ratio)}
                    {i === 0 && (
                      <span className="mr-2 inline-block rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                        الحالي
                      </span>
                    )}
                  </td>
                  <td className="num px-5 py-3.5">{Number(c.sell_fee_percent)}%</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {fmtDateTime(c.effective_from)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{fmtDateTime(c.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm({
                            id: c.id,
                            sak_to_gold_ratio: Number(c.sak_to_gold_ratio),
                            sell_fee_percent: Number(c.sell_fee_percent),
                            effective_from: new Date(c.effective_from).toISOString().slice(0, 16),
                          })
                        }
                        className="text-xs font-bold text-gold hover:underline"
                      >
                        تعديل
                      </button>
                      {canDelete(c.id) && (
                        <button
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذا الإعداد؟")) remove.mutate(c.id);
                          }}
                          className="text-xs font-bold text-destructive hover:underline"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
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
