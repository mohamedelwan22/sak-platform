import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { countriesApi } from "@/api/countries.api";

export const Route = createFileRoute("/_authenticated/admin/countries")({
  component: AdminCountriesPage,
});

type CountryForm = {
  id?: string;
  name: string;
  code: string;
  iso2: string;
  iso3: string;
  phoneCode: string;
  currency: string;
  currencyCode: string;
  nationality: string;
  flag: string;
  status: "active" | "inactive";
};

const emptyForm: CountryForm = {
  name: "",
  code: "",
  iso2: "",
  iso3: "",
  phoneCode: "",
  currency: "",
  currencyCode: "",
  nationality: "",
  flag: "",
  status: "active",
};

function extractError(e: unknown): string {
  if (
    e &&
    typeof e === "object" &&
    "response" in e &&
    e.response &&
    typeof e.response === "object" &&
    "data" in e.response &&
    e.response.data &&
    typeof e.response.data === "object" &&
    "error" in e.response.data &&
    e.response.data.error &&
    typeof e.response.data.error === "object" &&
    "message" in e.response.data.error
  ) {
    return String((e.response.data as { error: { message: string } }).error.message);
  }
  if (e instanceof Error) return e.message;
  return "حدث خطأ غير متوقع";
}

function AdminCountriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CountryForm | null>(null);
  const [search, setSearch] = useState("");

  const { data: countries, isLoading } = useQuery({
    queryKey: ["admin-countries"],
    queryFn: async () => {
      const res = await countriesApi.list({ limit: 1000, sortBy: "name", sortOrder: "asc" });
      return res.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: CountryForm) => {
      const payload = {
        name: f.name,
        code: f.code,
        iso2: f.iso2 || null,
        iso3: f.iso3 || null,
        phoneCode: f.phoneCode || null,
        currency: f.currency || null,
        currencyCode: f.currencyCode || null,
        nationality: f.nationality || null,
        flag: f.flag || null,
        status: f.status,
      };
      if (f.id) {
        await countriesApi.update(f.id, payload);
      } else {
        await countriesApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(form?.id ? "تم تحديث الدولة" : "تمت إضافة الدولة");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-countries"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await countriesApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف الدولة");
      queryClient.invalidateQueries({ queryKey: ["admin-countries"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const items = countries?.data ?? [];
  const filtered = items.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PortalShell title="إدارة الدول">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو الرمز…"
          className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
        />
        <button
          onClick={() => setForm(emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          + إضافة دولة
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id ? "تعديل دولة" : "دولة جديدة"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="الاسم (عربي)">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="الرمز (3 أحرف)">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className={inp}
                dir="ltr"
                maxLength={3}
              />
            </Field>
            <Field label="رمز ISO2">
              <input
                value={form.iso2}
                onChange={(e) => setForm({ ...form, iso2: e.target.value.toUpperCase() })}
                className={inp}
                dir="ltr"
                maxLength={2}
              />
            </Field>
            <Field label="رمز ISO3">
              <input
                value={form.iso3}
                onChange={(e) => setForm({ ...form, iso3: e.target.value.toUpperCase() })}
                className={inp}
                dir="ltr"
                maxLength={3}
              />
            </Field>
            <Field label="رمز الهاتف">
              <input
                value={form.phoneCode}
                onChange={(e) => setForm({ ...form, phoneCode: e.target.value })}
                className={inp}
                dir="ltr"
                placeholder="+20"
              />
            </Field>
            <Field label="العملة">
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="رمز العملة">
              <input
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
                className={inp}
                dir="ltr"
                maxLength={3}
              />
            </Field>
            <Field label="الجنسية">
              <input
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "inactive" })
                }
                className={inp}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
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
      ) : !filtered?.length ? (
        <EmptyState title="لا دول بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">الدولة</th>
                <th className="px-5 py-3.5 font-semibold">الرمز</th>
                <th className="px-5 py-3.5 font-semibold">الهاتف</th>
                <th className="px-5 py-3.5 font-semibold">العملة</th>
                <th className="px-5 py-3.5 font-semibold">المدن</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    <span className="mr-2">{c.flag}</span>
                    {c.name}
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">{c.code}</td>
                  <td className="num px-5 py-3.5 text-muted-foreground">{c.phoneCode}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {c.currencyCode ? `${c.currencyCode} — ${c.currency}` : c.currency}
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">{c._count?.cities ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm({
                            id: c.id,
                            name: c.name,
                            code: c.code,
                            iso2: c.iso2 ?? "",
                            iso3: c.iso3 ?? "",
                            phoneCode: c.phoneCode ?? "",
                            currency: c.currency ?? "",
                            currencyCode: c.currencyCode ?? "",
                            nationality: c.nationality ?? "",
                            flag: c.flag ?? "",
                            status: c.status as "active" | "inactive",
                          })
                        }
                        className="text-xs font-bold text-gold hover:underline"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف "${c.name}"؟`)) remove.mutate(c.id);
                        }}
                        className="text-xs font-bold text-destructive hover:underline"
                      >
                        حذف
                      </button>
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
