import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { walletsApi } from "@/api/wallets.api";
import { fmtSAK } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/wallets")({
  component: AdminWalletsPage,
});

type WalletForm =
  | { mode: "create"; userId: string }
  | { mode: "edit"; id: string; status: string; frozenBalance: string };

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

function AdminWalletsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WalletForm | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const res = await walletsApi.list({ limit: 1000, sortBy: "createdAt", sortOrder: "desc" });
      return res.data.data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: WalletForm) => {
      if (f.mode === "edit") {
        await walletsApi.update(f.id, {
          status: f.status,
          frozenBalance: parseFloat(f.frozenBalance) || 0,
        });
      } else {
        await walletsApi.create({ userId: f.userId });
      }
    },
    onSuccess: () => {
      toast.success(form?.mode === "edit" ? "تم تحديث المحفظة" : "تمت إضافة المحفظة");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await walletsApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف المحفظة");
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      await walletsApi.restore(id);
    },
    onSuccess: () => {
      toast.success("تم استعادة المحفظة");
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const items = wallets?.data ?? [];
  const filtered = items.filter((w) => {
    const userName = w.user ? `${w.user.firstName} ${w.user.lastName} ${w.user.email}` : "";
    const matchesSearch = !search || userName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PortalShell title="إدارة المحافظ">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="frozen">مجمدة</option>
            <option value="closed">مغلقة</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد…"
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
        </div>
        <button
          onClick={() => setForm({ mode: "create", userId: "" })}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          + محفظة جديدة
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.mode === "edit" ? "تعديل محفظة" : "محفظة جديدة"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {form.mode === "create" ? (
              <Field label="معرف المستخدم">
                <input
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className={inp}
                  dir="ltr"
                  placeholder="User ID"
                />
              </Field>
            ) : (
              <>
                <Field label="الحالة">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={inp}
                  >
                    <option value="active">نشط</option>
                    <option value="frozen">مجمدة</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </Field>
                <Field label="الرصيد المجمد (SAK)">
                  <input
                    value={form.frozenBalance}
                    onChange={(e) => setForm({ ...form, frozenBalance: e.target.value })}
                    className={inp}
                    dir="ltr"
                    type="number"
                    min={0}
                  />
                </Field>
              </>
            )}
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
        <EmptyState title="لا محافظ بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">المستخدم</th>
                <th className="px-5 py-3.5 font-semibold">الرصيد</th>
                <th className="px-5 py-3.5 font-semibold">الرصيد المجمد</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold">المعاملات</th>
                <th className="px-5 py-3.5 font-semibold">تاريخ الإنشاء</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {w.user ? `${w.user.firstName} ${w.user.lastName}` : "—"}
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">{fmtSAK(w.balance)}</td>
                  <td className="num px-5 py-3.5 text-muted-foreground">
                    {fmtSAK(w.frozenBalance)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="num px-5 py-3.5 text-muted-foreground">
                    {w._count?.transactions ?? 0}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {new Date(w.createdAt).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm({
                            mode: "edit",
                            id: w.id,
                            status: w.status,
                            frozenBalance: String(w.frozenBalance),
                          })
                        }
                        className="text-xs font-bold text-gold hover:underline"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => {
                          const msg = `هل أنت متأكد من حذف محفظة "${w.user?.firstName ?? w.id}"؟`;
                          if (confirm(msg)) remove.mutate(w.id);
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
