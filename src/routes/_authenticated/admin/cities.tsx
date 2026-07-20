import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { countriesApi } from "@/api/countries.api";
import { citiesApi } from "@/api/cities.api";

export const Route = createFileRoute("/_authenticated/admin/cities")({
  component: AdminCitiesPage,
});

type CityForm = {
  id?: string;
  countryId: string;
  name: string;
  isActive: boolean;
};

const emptyForm: CityForm = {
  countryId: "",
  name: "",
  isActive: true,
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

function AdminCitiesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CityForm | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: countries } = useQuery({
    queryKey: ["admin-countries"],
    queryFn: async () => {
      const res = await countriesApi.list({ limit: 1000, sortBy: "name", sortOrder: "asc" });
      return res.data.data;
    },
  });

  const { data: cities, isLoading } = useQuery({
    queryKey: ["admin-cities", countryFilter],
    queryFn: async () => {
      const res = await citiesApi.list({
        limit: 1000,
        sortBy: "name",
        sortOrder: "asc",
        ...(countryFilter ? { countryId: countryFilter } : {}),
      });
      return res.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: CityForm) => {
      const payload = { countryId: f.countryId, name: f.name, isActive: f.isActive };
      if (f.id) {
        await citiesApi.update(f.id, payload);
      } else {
        await citiesApi.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(form?.id ? "تم تحديث المدينة" : "تمت إضافة المدينة");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await citiesApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف المدينة");
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const countryMap = new Map((countries?.data ?? []).map((c) => [c.id, c]));
  const items = cities?.data ?? [];
  const filtered = items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PortalShell title="إدارة المدن">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الدول</option>
            {countries?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمدينة…"
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          />
        </div>
        <button
          onClick={() => setForm(emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          + إضافة مدينة
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id ? "تعديل مدينة" : "مدينة جديدة"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="الدولة">
              <select
                value={form.countryId}
                onChange={(e) => setForm({ ...form, countryId: e.target.value })}
                className={inp}
              >
                <option value="">اختر الدولة</option>
                {countries?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اسم المدينة">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="الحالة">
              <select
                value={form.isActive ? "true" : "false"}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}
                className={inp}
              >
                <option value="true">نشط</option>
                <option value="false">غير نشط</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.countryId}
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
        <EmptyState title="لا مدن بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">المدينة</th>
                <th className="px-5 py-3.5 font-semibold">الدولة</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">{c.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {countryMap.get(c.countryId)?.flag}{" "}
                    {c.country?.name ?? countryMap.get(c.countryId)?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.isActive ? "active" : "inactive"} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm({
                            id: c.id,
                            countryId: c.countryId,
                            name: c.name,
                            isActive: c.isActive,
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
