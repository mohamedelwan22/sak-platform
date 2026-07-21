import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { transactionsApi } from "@/api/transactions.api";
import { adminExportCsv } from "@/lib/admin.functions";
import { fmtSAK, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactionsPage,
});

const TYPE_LABELS: Record<string, string> = {
  deposit: "إيداع",
  withdrawal: "سحب",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
  adjustment: "تسوية",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  approved: "معتمدة",
  rejected: "مرفوضة",
  completed: "مكتملة",
};

type TransactionForm = {
  walletId: string;
  type: string;
  amount: string;
  description: string;
};

const emptyForm: TransactionForm = {
  walletId: "",
  type: "deposit",
  amount: "",
  description: "",
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

function AdminTransactionsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TransactionForm | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleExport = async () => {
    const blob = await adminExportCsv("transactions");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const res = await transactionsApi.list({
        limit: 1000,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return res.data.data;
    },
  });

  const create = useMutation({
    mutationFn: async (f: TransactionForm) => {
      await transactionsApi.create({
        walletId: f.walletId,
        type: f.type,
        amount: Number(f.amount),
        description: f.description || undefined,
      });
    },
    onSuccess: () => {
      toast.success("تم إنشاء المعاملة");
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      await transactionsApi.approve(id);
    },
    onSuccess: () => {
      toast.success("تم اعتماد المعاملة");
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await transactionsApi.reject(id, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast.success("تم رفض المعاملة");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await transactionsApi.delete(id);
    },
    onSuccess: () => {
      toast.success("تم حذف المعاملة");
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const items = transactions?.data ?? [];
  const filtered = items.filter((tx) => {
    const userName = tx.wallet?.user
      ? `${tx.wallet.user.firstName} ${tx.wallet.user.lastName}`
      : "";
    const matchesSearch =
      !search ||
      userName.toLowerCase().includes(search.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !typeFilter || tx.type === typeFilter;
    const matchesStatus = !statusFilter || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <PortalShell title="إدارة المعاملات">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الأنواع</option>
            <option value="deposit">إيداع</option>
            <option value="withdrawal">سحب</option>
            <option value="transfer_in">تحويل وارد</option>
            <option value="transfer_out">تحويل صادر</option>
            <option value="adjustment">تسوية</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="approved">معتمدة</option>
            <option value="rejected">مرفوضة</option>
            <option value="completed">مكتملة</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمستخدم أو الوصف…"
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
            + معاملة جديدة
          </button>
        </div>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">معاملة جديدة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="معرف المحفظة">
              <input
                value={form.walletId}
                onChange={(e) => setForm({ ...form, walletId: e.target.value })}
                className={inp}
                dir="ltr"
                placeholder="UUID"
              />
            </Field>
            <Field label="النوع">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inp}
              >
                <option value="deposit">إيداع</option>
                <option value="withdrawal">سحب</option>
                <option value="transfer_in">تحويل وارد</option>
                <option value="transfer_out">تحويل صادر</option>
                <option value="adjustment">تسوية</option>
              </select>
            </Field>
            <Field label="المبلغ (SAK)">
              <input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={inp}
                dir="ltr"
                type="number"
                step="0.00000001"
                min="0"
              />
            </Field>
            <Field label="الوصف">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inp}
                placeholder="اختياري"
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => create.mutate(form)}
              disabled={create.isPending || !form.walletId || !form.amount}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "جارٍ الإنشاء…" : "إنشاء"}
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

      {rejectId && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">رفض المعاملة</h2>
          <Field label="سبب الرفض">
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={inp}
              placeholder="اختياري"
            />
          </Field>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => reject.mutate({ id: rejectId, reason: rejectReason })}
              disabled={reject.isPending}
              className="rounded-lg bg-destructive px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {reject.isPending ? "جارٍ الرفض…" : "تأكيد الرفض"}
            </button>
            <button
              onClick={() => {
                setRejectId(null);
                setRejectReason("");
              }}
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
        <EmptyState title="لا معاملات بعد" />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">المستخدم</th>
                <th className="px-5 py-3.5 font-semibold">النوع</th>
                <th className="px-5 py-3.5 font-semibold">المبلغ</th>
                <th className="px-5 py-3.5 font-semibold">الحالة</th>
                <th className="px-5 py-3.5 font-semibold">الوصف</th>
                <th className="px-5 py-3.5 font-semibold">التاريخ</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 font-semibold text-foreground">
                    {tx.wallet?.user
                      ? `${tx.wallet.user.firstName} ${tx.wallet.user.lastName}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </td>
                  <td className="num px-5 py-3.5 text-foreground">{fmtSAK(Number(tx.amount))}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground max-w-40 truncate">
                    {tx.description ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {fmtDateTime(String(tx.createdAt))}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      {tx.status === "pending" && (
                        <>
                          <button
                            onClick={() => approve.mutate(tx.id)}
                            disabled={approve.isPending}
                            className="text-xs font-bold text-green-500 hover:underline disabled:opacity-50"
                          >
                            اعتماد
                          </button>
                          <button
                            onClick={() => setRejectId(tx.id)}
                            className="text-xs font-bold text-destructive hover:underline"
                          >
                            رفض
                          </button>
                        </>
                      )}
                      {tx.status === "pending" && (
                        <button
                          onClick={() => {
                            const msg = "هل أنت متأكد من حذف هذه المعاملة؟";
                            if (confirm(msg)) remove.mutate(tx.id);
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
