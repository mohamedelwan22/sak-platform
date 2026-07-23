import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import {
  adminListProjects,
  adminSaveProject,
  adminDeleteProject,
  type AdminProjectItem,
} from "@/lib/admin.functions";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  component: AdminProjectsPage,
});

type ProjectForm = {
  id?: string;
  title_ar: string;
  title_en: string;
  country: string;
  city: string;
  description_ar: string;
  description_en: string;
  cover_image_url: string;
  status: "draft" | "active" | "inactive";
  risk_level: "none" | "low" | "medium" | "high";
  expected_roi: number;
  sort_order: number;
};

const emptyForm: ProjectForm = {
  title_ar: "",
  title_en: "",
  country: "",
  city: "",
  description_ar: "",
  description_en: "",
  cover_image_url: "",
  status: "draft",
  risk_level: "low",
  expected_roi: 12,
  sort_order: 0,
};

const PAGE_SIZE = 15;

function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProjectForm | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-projects", { search, status: statusFilter, page }],
    queryFn: () =>
      adminListProjects({
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const projects = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const save = useMutation({
    mutationFn: (f: ProjectForm) =>
      adminSaveProject({
        id: f.id,
        title_ar: f.title_ar,
        title_en: f.title_en,
        country: f.country,
        city: f.city || null,
        description_ar: f.description_ar || null,
        description_en: f.description_en || null,
        cover_image_url: f.cover_image_url || null,
        status: f.status,
        risk_level: f.risk_level,
        expected_roi: Number(f.expected_roi),
        sort_order: Number(f.sort_order),
      }),
    onSuccess: () => {
      toast.success(form?.id ? "تم تحديث المشروع" : "تمت إضافة المشروع");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProject(id),
    onSuccess: () => {
      toast.success("تم حذف المشروع");
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PortalShell title="إدارة المشاريع">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-3 sm:w-auto">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم…"
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="draft">مسودة</option>
          </select>
        </div>
        <button
          onClick={() => setForm(emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          + إضافة مشروع
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id ? "تعديل مشروع" : "مشروع جديد"}
          </h2>
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
            <Field label="رابط صورة الغلاف">
              <input
                value={form.cover_image_url}
                onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                className={inp}
                dir="ltr"
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
                  setForm({ ...form, risk_level: e.target.value as ProjectForm["risk_level"] })
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
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectForm["status"] })
                }
                className={inp}
              >
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </Field>
            <Field label="الترتيب">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label="الوصف (عربي)" full>
              <textarea
                rows={3}
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="الوصف (إنجليزي)" full>
              <textarea
                rows={3}
                value={form.description_en}
                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                className={inp}
                dir="ltr"
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
      ) : !projects.length ? (
        <EmptyState title="لا مشاريع بعد" />
      ) : (
        <>
          <div className="card-luxe overflow-x-auto !p-0">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">المشروع</th>
                  <th className="px-5 py-3.5 font-semibold">الموقع</th>
                  <th className="px-5 py-3.5 font-semibold">العائد المتوقع</th>
                  <th className="px-5 py-3.5 font-semibold">المخاطر</th>
                  <th className="px-5 py-3.5 font-semibold">الأراضي</th>
                  <th className="px-5 py-3.5 font-semibold">الحالة</th>
                  <th className="px-5 py-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: AdminProjectItem) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="px-5 py-3.5 font-semibold text-foreground">{p.title_ar}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {p.city ? `${p.city}، ` : ""}
                      {p.country}
                    </td>
                    <td className="num px-5 py-3.5 text-gold">{fmtNum(Number(p.expected_roi))}%</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.risk_level} />
                    </td>
                    <td className="num px-5 py-3.5">{p._count?.lands ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setForm({
                              id: p.id,
                              title_ar: p.title_ar,
                              title_en: p.title_en,
                              country: p.country,
                              city: p.city ?? "",
                              description_ar: p.description_ar ?? "",
                              description_en: p.description_en ?? "",
                              cover_image_url: p.cover_image_url ?? "",
                              status: p.status as ProjectForm["status"],
                              risk_level: p.risk_level as ProjectForm["risk_level"],
                              expected_roi: Number(p.expected_roi),
                              sort_order: p.sort_order,
                            })
                          }
                          className="text-xs font-bold text-gold hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف "${p.title_ar}"؟`))
                              remove.mutate(p.id);
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

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
              >
                السابق
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce<(number | "dots")[]>((acc, n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("dots");
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "dots" ? (
                    <span key={`dots-${idx}`} className="px-2 py-2 text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      className={`rounded-lg px-4 py-2 text-sm font-bold ${
                        page === item
                          ? "bg-gold-gradient text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          )}
        </>
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
