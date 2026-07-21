import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { notificationsApi } from "@/api/notifications.api";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: AdminNotificationsPage,
});

type NotificationForm = {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: string;
};

const emptyForm: NotificationForm = {
  userId: "",
  title: "",
  message: "",
  type: "system",
};

const typeOptions = [
  { value: "system", label: "نظام" },
  { value: "transaction", label: "معاملة" },
  { value: "kyc", label: "تحقق الهوية" },
  { value: "investment", label: "استثمار" },
  { value: "wallet", label: "محفظة" },
];

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

function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<NotificationForm | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [readFilter, setReadFilter] = useState("");

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const res = await notificationsApi.list({
        limit: 1000,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return res.data.data;
    },
  });

  const unreadCount = (notifications?.data ?? []).filter((n) => !n.isRead).length;

  const save = useMutation({
    mutationFn: async (f: NotificationForm) => {
      await notificationsApi.create({
        userId: f.userId,
        title: f.title,
        message: f.message,
        type: f.type,
      });
    },
    onSuccess: () => {
      toast.success("تم إرسال الإشعار");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.markAsRead(id);
    },
    onSuccess: () => {
      toast.success("تم تحديد الإشعار كمقروء");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await notificationsApi.markAllAsRead("");
    },
    onSuccess: () => {
      toast.success("تم تحديد الكل كمقروء");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف الإشعار");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const items = notifications?.data ?? [];
  const filtered = items.filter((n) => {
    const matchesSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || n.type === typeFilter;
    const matchesRead =
      readFilter === "" ||
      (readFilter === "read" && n.isRead) ||
      (readFilter === "unread" && !n.isRead);
    return matchesSearch && matchesType && matchesRead;
  });

  return (
    <PortalShell title="إدارة الإشعارات">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">الكل</option>
            <option value="read">مقروءة</option>
            <option value="unread">غير مقروءة</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الأنواع</option>
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان أو المحتوى…"
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
              <span className="h-2 w-2 rounded-full bg-gold" />
              {unreadCount} غير مقروءة
            </span>
          )}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-bold text-foreground disabled:opacity-50"
            >
              {markAllAsRead.isPending ? "جارٍ…" : "تحديد الكل مقروء"}
            </button>
          )}
          <button
            onClick={() => setForm(emptyForm)}
            className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            + إشعار جديد
          </button>
        </div>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">إشعار جديد</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="معرف المستخدم">
              <input
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className={inp}
                dir="ltr"
                placeholder="user-id"
              />
            </Field>
            <Field label="النوع">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inp}
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="العنوان">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="الرسالة">
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={inp}
                rows={3}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending ? "جارٍ الإرسال…" : "إرسال الإشعار"}
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
        <EmptyState title="لا إشعارات بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">المستخدم</th>
                <th className="px-5 py-3.5 font-semibold">العنوان</th>
                <th className="px-5 py-3.5 font-semibold">النوع</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ الإنشاء</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => {
                const typeLabel = typeOptions.find((t) => t.value === n.type)?.label ?? n.type;
                return (
                  <tr key={n.id} className="border-b border-border/50 hover:bg-secondary/40">
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      {n.user ? `${n.user.firstName} ${n.user.lastName}` : n.userId}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      <div className="max-w-48 truncate" title={n.title}>
                        {n.title}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{typeLabel}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={n.isRead ? "completed" : "pending"} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        {!n.isRead && (
                          <button
                            onClick={() => markAsRead.mutate(n.id)}
                            disabled={markAsRead.isPending}
                            className="text-xs font-bold text-gold hover:underline disabled:opacity-50"
                          >
                            تحديد مقروء
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const msg = `هل أنت متأكد من حذف الإشعار "${n.title}"؟`;
                            if (confirm(msg)) remove.mutate(n.id);
                          }}
                          className="text-xs font-bold text-destructive hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
