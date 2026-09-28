import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { walletsApi } from "@/api/wallets.api";
import { fmtSAK } from "@/lib/format";
import { t } from "@/i18n";

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
  return t("_authenticatedAdminWallets.k20");
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
      toast.success(
        form?.mode === "edit"
          ? t("_authenticatedAdminWallets.k21")
          : t("_authenticatedAdminWallets.k22"),
      );
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
      toast.success(t("_authenticatedAdminWallets.k23"));
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      await walletsApi.restore(id);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedAdminWallets.k24"));
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
    <PortalShell title={t("_authenticatedAdminWallets.k14")}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">{t("_authenticatedAdminWallets.k1")}</option>
            <option value="active">{t("_authenticatedAdminWallets.k2")}</option>
            <option value="frozen">{t("_authenticatedAdminWallets.k3")}</option>
            <option value="closed">{t("_authenticatedAdminWallets.k4")}</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("_authenticatedAdminWallets.k15")}
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
        </div>
        <button
          onClick={() => setForm({ mode: "create", userId: "" })}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("_authenticatedAdminWallets.k10000")}
        </button>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.mode === "edit"
              ? t("_authenticatedAdminWallets.k25")
              : t("_authenticatedAdminWallets.k26")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {form.mode === "create" ? (
              <Field label={t("_authenticatedAdminWallets.k16")}>
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
                <Field label={t("_authenticatedAdminWallets.k17")}>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={inp}
                  >
                    <option value="active">{t("_authenticatedAdminWallets.k5")}</option>
                    <option value="frozen">{t("_authenticatedAdminWallets.k6")}</option>
                    <option value="closed">{t("_authenticatedAdminWallets.k7")}</option>
                  </select>
                </Field>
                <Field label={t("_authenticatedAdminWallets.k18")}>
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
              {save.isPending
                ? t("_authenticatedAdminWallets.k27")
                : t("_authenticatedAdminWallets.k28")}
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("_authenticatedAdminWallets.k10001")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !filtered.length ? (
        <EmptyState title={t("_authenticatedAdminWallets.k19")} />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k8")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k9")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k10")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k11")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k12")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminWallets.k13")}</th>
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
                        {t("_authenticatedAdminWallets.k10002")}
                      </button>
                      <button
                        onClick={() => {
                          const msg = t("adminWallets.m1", { v: w.user?.firstName ?? w.id });
                          if (confirm(msg)) remove.mutate(w.id);
                        }}
                        className="text-xs font-bold text-destructive hover:underline"
                      >
                        {t("_authenticatedAdminWallets.k10003")}
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
