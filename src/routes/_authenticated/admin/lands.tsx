import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { adminListLands, adminSaveLand } from "@/lib/admin.functions";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/lands")({
  component: AdminLandsPage,
});

type LandForm = {
  id?: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  asset_type: "land" | "hotel" | "mall" | "warehouse" | "resort" | "agricultural";
  country: string;
  city: string;
  area_m2: number;
  total_sak_inventory: number;
  available_sak: number;
  maturity_months: number;
  expected_roi: number;
  risk_level: "none" | "low" | "medium" | "high";
  status: "draft" | "active" | "partially_sold" | "sold_out" | "closed";
};

const emptyForm: LandForm = {
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  asset_type: "agricultural",
  country: "",
  city: "",
  area_m2: 0,
  total_sak_inventory: 10000,
  available_sak: 10000,
  maturity_months: 12,
  expected_roi: 12,
  risk_level: "low",
  status: "draft",
};

function AdminLandsPage() {
  const listFn = useServerFn(adminListLands);
  const saveFn = useServerFn(adminSaveLand);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LandForm | null>(null);

  const { data: lands, isLoading } = useQuery({
    queryKey: ["admin-lands"],
    queryFn: () => listFn(),
  });

  const save = useMutation({
    mutationFn: (f: LandForm) =>
      saveFn({
        data: {
          ...f,
          project_id: null,
          cover_image_url: null,
          area_m2: Number(f.area_m2),
          total_sak_inventory: Number(f.total_sak_inventory),
          available_sak: Number(f.available_sak),
          maturity_months: Number(f.maturity_months),
          expected_roi: Number(f.expected_roi),
        },
      }),
    onSuccess: () => {
      toast.success("تم حفظ الأصل");
      setForm(null);
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PortalShell title="إدارة الأصول">
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setForm(emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          + إضافة أصل
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">{form.id ? "تعديل أصل" : "أصل جديد"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="العنوان (عربي)">
              <input
                value={form.title_ar}
                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="العنوان (إنجليزي)">
              <input
                value={form.title_en}
                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                className={inp}
                dir="ltr"
              />
            </Field>
            <Field label="الدولة">
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="المدينة">
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="نوع الأصل">
              <select
                value={form.asset_type}
                onChange={(e) =>
                  setForm({ ...form, asset_type: e.target.value as LandForm["asset_type"] })
                }
                className={inp}
              >
                <option value="agricultural">زراعي</option>
                <option value="land">أرض</option>
                <option value="hotel">فندق</option>
                <option value="mall">مول</option>
                <option value="warehouse">مستودع</option>
                <option value="resort">منتجع</option>
              </select>
            </Field>
            <Field label="المساحة (م²)">
              <input
                type="number"
                value={form.area_m2}
                onChange={(e) => setForm({ ...form, area_m2: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="إجمالي وحدات SAK">
              <input
                type="number"
                value={form.total_sak_inventory}
                onChange={(e) => setForm({ ...form, total_sak_inventory: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="الوحدات المتاحة">
              <input
                type="number"
                value={form.available_sak}
                onChange={(e) => setForm({ ...form, available_sak: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="مدة الاستحقاق (أشهر)">
              <input
                type="number"
                value={form.maturity_months}
                onChange={(e) => setForm({ ...form, maturity_months: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="العائد المتوقع %">
              <input
                type="number"
                value={form.expected_roi}
                onChange={(e) => setForm({ ...form, expected_roi: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="مستوى المخاطر">
              <select
                value={form.risk_level}
                onChange={(e) =>
                  setForm({ ...form, risk_level: e.target.value as LandForm["risk_level"] })
                }
                className={inp}
              >
                <option value="none">بدون</option>
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">مرتفع</option>
              </select>
            </Field>
            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LandForm["status"] })}
                className={inp}
              >
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
                <option value="closed">مغلق</option>
              </select>
            </Field>
            <Field label="الوصف (عربي)" full>
              <textarea
                rows={3}
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                className={inp}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
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
      ) : !lands?.length ? (
        <EmptyState title="لا أصول بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">الأصل</th>
                <th className="px-5 py-3.5 font-semibold">الموقع</th>
                <th className="px-5 py-3.5 font-semibold">الإجمالي</th>
                <th className="px-5 py-3.5 font-semibold">المتاح</th>
                <th className="px-5 py-3.5 font-semibold">الاستحقاق</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {lands.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{l.title_ar}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {l.city}، {l.country}
                  </td>
                  <td className="num px-5 py-3.5">{fmtNum(Number(l.total_sak_inventory))}</td>
                  <td className="num px-5 py-3.5 text-gold">{fmtNum(Number(l.available_sak))}</td>
                  <td className="num px-5 py-3.5">{l.maturity_months} شهر</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() =>
                        setForm({
                          id: l.id,
                          title_ar: l.title_ar,
                          title_en: l.title_en,
                          description_ar: l.description_ar,
                          description_en: l.description_en,
                          asset_type: l.asset_type as LandForm["asset_type"],
                          country: l.country,
                          city: l.city,
                          area_m2: Number(l.area_m2),
                          total_sak_inventory: Number(l.total_sak_inventory),
                          available_sak: Number(l.available_sak),
                          maturity_months: l.maturity_months,
                          expected_roi: Number(l.expected_roi),
                          risk_level: l.risk_level as LandForm["risk_level"],
                          status: l.status as LandForm["status"],
                        })
                      }
                      className="text-xs font-bold text-gold hover:underline"
                    >
                      تعديل
                    </button>
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

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
