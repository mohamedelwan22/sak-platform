import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/apiError";
import type { AxiosError } from "axios";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, StatusBadge } from "@/components/shared/ui-kit";
import { investorsApi } from "@/api/investors.api";
import { adminExportCsv } from "@/lib/admin.functions";
import { t } from "@/i18n";

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
  // Surfaces per-field validation detail (e.g. which input was rejected)
  // instead of a bare "Validation failed".
  return extractErrorMessage(e, t("_authenticatedAdminInvestors.k25"));
}

function AdminInvestorsPage() {
  const { pathname } = useLocation();
  const isDetail = pathname !== "/admin/investors" && pathname.startsWith("/admin/investors/");
  if (isDetail) return <Outlet />;
  return <InvestorsList />;
}

function InvestorsList() {
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
      toast.success(
        form?.id ? t("_authenticatedAdminInvestors.k26") : t("_authenticatedAdminInvestors.k27"),
      );
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
      toast.success(t("_authenticatedAdminInvestors.k28"));
      queryClient.invalidateQueries({ queryKey: ["admin-investors"] });
    },
    onError: (e: AxiosError) => toast.error(extractError(e)),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      await investorsApi.restore(id);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedAdminInvestors.k29"));
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
    <PortalShell title={t("_authenticatedAdminInvestors.k16")}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold"
          >
            <option value="">{t("_authenticatedAdminInvestors.k1")}</option>
            <option value="active">{t("_authenticatedAdminInvestors.k2")}</option>
            <option value="inactive">{t("_authenticatedAdminInvestors.k3")}</option>
            <option value="suspended">{t("_authenticatedAdminInvestors.k4")}</option>
            <option value="pending">{t("_authenticatedAdminInvestors.k5")}</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("_authenticatedAdminInvestors.k17")}
            className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-gold sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg border border-input bg-secondary px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary/80"
          >
            {t("_authenticatedAdminInvestors.k10000")}
          </button>
          <button
            onClick={() => setForm(emptyForm)}
            className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            {t("_authenticatedAdminInvestors.k10001")}
          </button>
        </div>
      </div>

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">
            {form.id
              ? t("_authenticatedAdminInvestors.k30")
              : t("_authenticatedAdminInvestors.k31")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t("_authenticatedAdminInvestors.k18")}>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label={t("_authenticatedAdminInvestors.k19")}>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label={t("_authenticatedAdminInvestors.k20")}>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inp}
                dir="ltr"
                type="email"
              />
            </Field>
            {!form.id && (
              <Field label={t("_authenticatedAdminInvestors.k21")}>
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
            <Field label={t("_authenticatedAdminInvestors.k22")}>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inp}
                dir="ltr"
                inputMode="tel"
                placeholder="01159279715 or +201159279716"
              />
            </Field>
            <Field label={t("_authenticatedAdminInvestors.k23")}>
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
                <option value="active">{t("_authenticatedAdminInvestors.k6")}</option>
                <option value="inactive">{t("_authenticatedAdminInvestors.k7")}</option>
                <option value="suspended">{t("_authenticatedAdminInvestors.k8")}</option>
                <option value="pending">{t("_authenticatedAdminInvestors.k9")}</option>
              </select>
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {save.isPending
                ? t("_authenticatedAdminInvestors.k32")
                : t("_authenticatedAdminInvestors.k33")}
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("_authenticatedAdminInvestors.k10002")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !filtered.length ? (
        <EmptyState title={t("_authenticatedAdminInvestors.k24")} />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k10")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k11")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k12")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k13")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k14")}
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  {t("_authenticatedAdminInvestors.k15")}
                </th>
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
                          {t("_authenticatedAdminInvestors.k10003")}
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
                            {t("_authenticatedAdminInvestors.k10004")}
                          </button>
                          <button
                            onClick={() => {
                              const msg = t("common.confirmDeleteName", {
                                name: `${inv.firstName} ${inv.lastName}`,
                              });
                              if (confirm(msg)) remove.mutate(inv.id);
                            }}
                            className="text-xs font-bold text-destructive hover:underline"
                          >
                            {t("_authenticatedAdminInvestors.k10005")}
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
