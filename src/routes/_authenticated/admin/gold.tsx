import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert, Activity } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import {
  adminListGoldPrices,
  adminCreateGoldPrice,
  adminDeleteGoldPrice,
  adminGoldStatistics,
  adminMarketStatus,
  adminMarketRefresh,
  adminMarketOverride,
} from "@/lib/admin.functions";
import { fmtUSD, fmtDateTime, fmtNum } from "@/lib/format";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/gold")({
  component: AdminGoldPage,
});

type GoldForm = {
  gram_price_usd: number;
  source: string;
};

type OverrideForm = {
  price_per_ounce: number;
  reason: string;
};

const emptyForm: GoldForm = {
  gram_price_usd: 0,
  source: "manual",
};

const emptyOverride: OverrideForm = {
  price_per_ounce: 0,
  reason: "",
};

const PAGE_SIZE = 15;

function AdminGoldPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GoldForm | null>(null);
  const [overrideForm, setOverrideForm] = useState<OverrideForm | null>(null);
  const [page, setPage] = useState(1);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["admin-market-status"],
    queryFn: () => adminMarketStatus(),
    refetchInterval: 30_000,
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: ["admin-gold-prices", page],
    queryFn: () => adminListGoldPrices({ page, limit: PAGE_SIZE }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-gold-statistics"],
    queryFn: () => adminGoldStatistics(),
  });

  const invalidateMarket = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-market-status"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gold-prices"] });
    queryClient.invalidateQueries({ queryKey: ["admin-gold-statistics"] });
    queryClient.invalidateQueries({ queryKey: ["market-gold"] });
    queryClient.invalidateQueries({ queryKey: ["market-sak-price"] });
    queryClient.invalidateQueries({ queryKey: ["gold-price"] });
  };

  const refresh = useMutation({
    mutationFn: () => adminMarketRefresh(),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminGold.k18"));
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const override = useMutation({
    mutationFn: (f: OverrideForm) =>
      adminMarketOverride({ pricePerOunce: f.price_per_ounce, reason: f.reason }),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminGold.k19"));
      setOverrideForm(null);
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: (f: GoldForm) =>
      adminCreateGoldPrice({
        gram_price_usd: Number(f.gram_price_usd),
        source: f.source || "manual",
      }),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminGold.k20"));
      setForm(null);
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteGoldPrice(id),
    onSuccess: () => {
      toast.success(t("_authenticatedAdminGold.k21"));
      invalidateMarket();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = stats as Record<string, unknown> | undefined;
  const totalPages = prices?.totalPages ?? 1;
  const provider = status?.provider;

  return (
    <PortalShell title={t("_authenticatedAdminGold.k4")}>
      {/* Live provider + cache status */}
      <div className="card-luxe gold-ring mb-8 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Activity className="h-4 w-4 text-gold" />
            {t("_authenticatedAdminGold.k10000")}
          </h2>
          <button
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
            className="flex items-center gap-2 rounded-lg bg-gold-gradient px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refresh.isPending ? "animate-spin" : ""}`} />
            {refresh.isPending
              ? t("_authenticatedAdminGold.k22")
              : t("_authenticatedAdminGold.k23")}
          </button>
        </div>

        {statusLoading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatusBox
              label={t("_authenticatedAdminGold.k5")}
              value={
                status?.price
                  ? fmtUSD(Number(status.price.gold.pricePerOunce))
                  : t("_authenticatedAdminGold.k24")
              }
              hint={
                status?.price
                  ? fmtUSD(Number(status.price.gold.pricePerGram)) +
                    t("_authenticatedAdminGold.k25")
                  : undefined
              }
            />
            <StatusBox
              label={t("_authenticatedAdminGold.k6")}
              value={
                provider?.cache.active
                  ? t("_authenticatedAdminGold.k26")
                  : t("_authenticatedAdminGold.k27")
              }
              hint={
                provider?.cache.active
                  ? t("adminGold.m1", { v: provider.cache.secondsUntilExpiry })
                  : t("_authenticatedAdminGold.k28")
              }
              tone={provider?.cache.active ? "success" : "muted"}
            />
            <StatusBox
              label={t("_authenticatedAdminGold.k7")}
              value={provider?.lastSuccessAt ? fmtDateTime(provider.lastSuccessAt) : "—"}
              hint={
                status?.price
                  ? `${t("common.source")}: ${status.price.source}${status.price.isStale ? t("_authenticatedAdminGold.k29") : ""}`
                  : undefined
              }
            />
            <StatusBox
              label={t("_authenticatedAdminGold.k8")}
              value={
                provider?.lastError
                  ? t("_authenticatedAdminGold.k30")
                  : t("_authenticatedAdminGold.k31")
              }
              hint={provider?.lastErrorAt ? fmtDateTime(provider.lastErrorAt) : undefined}
              tone={provider?.lastError ? "danger" : "muted"}
            />
          </div>
        )}
      </div>

      {!statsLoading && stat && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("_authenticatedAdminGold.k9")}
            value={stat.max != null ? fmtUSD(Number(stat.max)) : "—"}
          />
          <StatCard
            label={t("_authenticatedAdminGold.k10")}
            value={stat.min != null ? fmtUSD(Number(stat.min)) : "—"}
          />
          <StatCard
            label={t("_authenticatedAdminGold.k11")}
            value={stat.avg != null ? fmtUSD(Number(stat.avg)) : "—"}
          />
        </div>
      )}

      <div className="mb-6 flex justify-end gap-3">
        <button
          onClick={() => setOverrideForm(overrideForm ? null : { ...emptyOverride })}
          className="flex items-center gap-2 rounded-lg border border-amber-500/50 px-5 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/10"
        >
          <ShieldAlert className="h-4 w-4" />
          {t("_authenticatedAdminGold.k10001")}
        </button>
        <button
          onClick={() => setForm(form ? null : emptyForm)}
          className="bg-gold-gradient shadow-gold rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {form ? t("_authenticatedAdminGold.k32") : t("_authenticatedAdminGold.k33")}
        </button>
      </div>

      {/* Manual override — audited, reason required */}
      {overrideForm && (
        <div className="card-luxe mb-8 border-amber-500/30 p-6">
          <h2 className="mb-1 flex items-center gap-2 font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            {t("_authenticatedAdminGold.k10002")}
          </h2>
          <p className="mb-5 text-xs text-muted-foreground">
            {t("_authenticatedAdminGold.k10003")}
            {t("_authenticatedAdminGold.k10004")}
            MANUAL_OVERRIDE.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("_authenticatedAdminGold.k12")}>
              <input
                type="number"
                step="0.01"
                value={overrideForm.price_per_ounce || ""}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, price_per_ounce: Number(e.target.value) })
                }
                className={`num ${inp}`}
              />
            </Field>
            <Field label={t("_authenticatedAdminGold.k13")}>
              <input
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                className={inp}
                placeholder={t("_authenticatedAdminGold.k14")}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => override.mutate(overrideForm)}
              disabled={
                override.isPending ||
                !overrideForm.price_per_ounce ||
                overrideForm.price_per_ounce <= 0 ||
                overrideForm.reason.trim().length < 10
              }
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {override.isPending
                ? t("_authenticatedAdminGold.k34")
                : t("_authenticatedAdminGold.k35")}
            </button>
            <button
              onClick={() => setOverrideForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("_authenticatedAdminGold.k10005")}
            </button>
          </div>
        </div>
      )}

      {form && (
        <div className="card-luxe gold-ring mb-8 p-6">
          <h2 className="mb-5 font-bold text-foreground">{t("_authenticatedAdminGold.k1")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("_authenticatedAdminGold.k15")}>
              <input
                type="number"
                step="0.01"
                value={form.gram_price_usd || ""}
                onChange={(e) => setForm({ ...form, gram_price_usd: Number(e.target.value) })}
                className={`num ${inp}`}
              />
            </Field>
            <Field label={t("_authenticatedAdminGold.k16")}>
              <input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inp}
                placeholder="manual"
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => create.mutate(form)}
              disabled={create.isPending || !form.gram_price_usd || form.gram_price_usd <= 0}
              className="bg-gold-gradient rounded-lg px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending
                ? t("_authenticatedAdminGold.k36")
                : t("_authenticatedAdminGold.k37")}
            </button>
            <button
              onClick={() => setForm(null)}
              className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-bold text-foreground"
            >
              {t("_authenticatedAdminGold.k10006")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !prices?.data?.length ? (
        <EmptyState title={t("_authenticatedAdminGold.k17")} />
      ) : (
        <div className="card-luxe overflow-x-auto !p-0">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminGold.k2")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminGold.k10000")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminGold.k10001")}</th>
                <th className="px-5 py-3.5 font-semibold">{t("_authenticatedAdminGold.k3")}</th>
                <th className="px-5 py-3.5 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {prices.data.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-5 py-3.5 text-muted-foreground">{fmtDateTime(p.fetched_at)}</td>
                  <td className="num px-5 py-3.5 font-semibold text-gold">
                    {fmtUSD(Number(p.price_per_ounce))}
                  </td>
                  <td className="num px-5 py-3.5 font-semibold text-foreground">
                    {fmtUSD(Number(p.gram_price_usd))}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{p.source}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        if (confirm(t("_authenticatedAdminGold.k38"))) remove.mutate(p.id);
                      }}
                      className="text-xs font-bold text-destructive hover:underline"
                    >
                      {t("_authenticatedAdminGold.k10007")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
          >
            {t("_authenticatedAdminGold.k10008")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("_authenticatedAdminGold.k10002")} {fmtNum(page)} / {fmtNum(totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground disabled:opacity-40"
          >
            {t("_authenticatedAdminGold.k10009")}
          </button>
        </div>
      )}
    </PortalShell>
  );
}

function StatusBox({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-gold";
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-luxe p-4">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
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
