import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { investorsApi } from "@/api/investors.api";
import { adminExportCsv } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/investors")({
  component: AdminInvestorsPage,
});

type InvestorForm = {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: "active" | "inactive" | "suspended" | "pending";
};

const emptyForm: InvestorForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
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

function AdminInvestorsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InvestorForm | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const handleExport = async () => {
    const blob = await adminExportCsv("investors");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "investors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: investors, isLoading } = useQuery({
    queryKey: ["admin-investors"],
    queryFn: async () => {
      const res = await investorsApi.list({ limit: 1000, sortBy: "createdAt", sortOrder: "desc" });
      return res.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: InvestorForm) => {
      if (f.id) {
        await investorsApi.update(f.id, {
          email: f.email,
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone || null,
          status: f.status,
        });
      } else {
        await investorsApi.create({
          email: f.email,
          password: f.password,
          firstName: f.firstName,
          lastName: f.lastName,
          phone: f.phone || null,
          status: f.status,
        });
      }
    },
    onSuccess: () => {
      toast.success(form?.id ? "تم تحديث المستثمر" : "تمت إضافة المستثمر");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-investors"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await investorsApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف المستثمر");
      queryClient.invalidateQueries({ queryKey: ["admin-investors"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      await investorsApi.restore(id);
    },
    onSuccess: () => {
      toast.success("تم استعادة المستثمر");
      queryClient.invalidateQueries({ queryKey: ["admin-investors"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const items = investors?.data ?? [];
  const filtered = items.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.firstName.toLowerCase().includes(search.toLowerCase()) ||
      inv.lastName.toLowerCase().includes(search.toLowerCase()) ||
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.phone && inv.phone.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = !statusFilter || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PortalShell title="إدارة المستثمرين">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="suspended">معلّق</option>
            <option value="pending">قيد المراجعة</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد أو الهاتف…"
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg border border-input bg-secondary px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary/80"
          >
            تصدير CSV
          </button>
          <button
            onClick={() => setForm(emptyForm)}
            className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            + إضافة مستثمر
          </button>
        </div>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id ? "تعديل مستثمر" : "مستثمر جديد"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="الاسم الأول">
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="اسم العائلة">
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inp}
                dir="ltr"
                type="email"
              />
            </Field>
            {!form.id && (
              <Field label="كلمة المرور">
                <input
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inp}
                  dir="ltr"
                  type="password"
                  minLength={8}
                />
              </Field>
            )}
            <Field label="الهاتف">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inp}
                dir="ltr"
                placeholder="+966xxxxxxxxx"
              />
            </Field>
            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as InvestorForm["status"],
                  })
                }
                className={inp}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="suspended">معلّق</option>
                <option value="pending">قيد المراجعة</option>
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
      ) : !filtered.length ? (
        <EmptyState title="لا مستثمرين بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">المستثمر</th>
                <th className="px-5 py-3.5 font-semibold">البريد</th>
                <th className="px-5 py-3.5 font-semibold">الهاتف</th>
                <th className="px-5 py-3.5 font-semibold">الجلسات</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ التسجيل</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {inv.firstName} {inv.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground" dir="ltr">
                    {inv.email}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground" dir="ltr">
                    {inv.phone ?? "—"}
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">
                    {inv._count?.sessions ?? 0}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={inv.deletedAt ? "inactive" : inv.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      {inv.deletedAt ? (
                        <button
                          onClick={() => restore.mutate(inv.id)}
                          disabled={restore.isPending}
                          className="text-xs font-bold text-green-500 hover:underline disabled:opacity-50"
                        >
                          استعادة
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              setForm({
                                id: inv.id,
                                email: inv.email,
                                password: "",
                                firstName: inv.firstName,
                                lastName: inv.lastName,
                                phone: inv.phone ?? "",
                                status: inv.status as InvestorForm["status"],
                              })
                            }
                            className="text-xs font-bold text-gold hover:underline"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => {
                              const msg = `هل أنت متأكد من حذف "${inv.firstName} ${inv.lastName}"؟`;
                              if (confirm(msg)) remove.mutate(inv.id);
                            }}
                            className="text-xs font-bold text-destructive hover:underline"
                          >
                            حذف
                          </button>
                        </>
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
