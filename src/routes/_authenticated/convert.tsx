import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, ShoppingCart, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, Spinner, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useWallet } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtNum } from "@/lib/format";
import { marketplaceApi } from "@/api/marketplace.api";
import { profileApi } from "@/api/profile.api";
import { investmentRequestsApi } from "@/api/phase04.api";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/convert")({
  component: ConvertPage,
});

interface CatalogLand {
  id: string;
  title_ar: string;
  price_per_sak_usd: number | null;
  available_sak: number | string;
  status: string;
  asset_type: string;
  country: string;
  city: string;
  expected_roi: number | null;
  maturity_months: number | null;
}

function ConvertPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: wallet } = useWallet(userId);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [landId, setLandId] = useState("");
  const [holdingId, setHoldingId] = useState("");
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);

  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const livePrice = sakPrice(gold, config);

  const { data: catalog } = useQuery({
    queryKey: ["marketplace-catalog-convert"],
    enabled: !!userId,
    queryFn: async () => {
      const res = await marketplaceApi.getCatalog();
      return res.data.data;
    },
  });

  const { data: holdings } = useQuery({
    queryKey: ["my-holdings-convert", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.holdings();
      const raw = res.data.data;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const price = livePrice ?? (catalog?.price != null ? Number(catalog.price) : null);
  const feePct = catalog?.sell_fee_percent != null ? Number(catalog.sell_fee_percent) : null;
  const lands: CatalogLand[] = Array.isArray(catalog?.lands) ? catalog.lands : [];
  const availableHoldings = (Array.isArray(holdings) ? holdings : []).filter(
    (h: { status: string }) => h.status !== "sold",
  );

  const qty = Math.max(0, Number(amount) || 0);
  const sellFee = mode === "sell" && feePct != null ? (qty * (price ?? 0) * feePct) / 100 : 0;
  const sellNetUsd = mode === "sell" && price != null ? qty * price - sellFee : null;

  const maxSell =
    mode === "sell" && holdingId
      ? Math.floor(
          Number(
            (
              availableHoldings.find((h: { id: string }) => h.id === holdingId) as
                { sak_owned: number | string } | undefined
            )?.sak_owned ?? 0,
          ),
        )
      : 0;

  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => {
      if (mode === "buy") {
        if (!landId) throw new Error(t("_authenticatedConvert.k15"));
        if (price == null || buyTotal <= 0) throw new Error(t("_authenticatedConvert.k16"));
        return investmentRequestsApi.create({
          landId,
          amountUsd: buyTotal,
          source: "marketplace",
        });
      }
      return marketplaceApi.convert({
        direction: mode,
        sakAmount: amount,
        holdingId,
      });
    },
    onSuccess: (res, variables) => {
      if (mode === "buy") {
        const created = res.data.data as { id: string };
        toast.success(t("_authenticatedConvert.k17"));
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["holdings"] });
        queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
        navigate({ to: "/investment-requests/$id", params: { id: created.id } });
      } else {
        setSuccess(res.data.data ?? res.data);
        toast.success(t("_authenticatedConvert.k18"));
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["holdings"] });
        queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      }
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = e?.response?.data?.error?.message || (err as Error)?.message || "";
      if (mode === "buy") {
        toast.error(
          msg.includes("active investment request")
            ? t("_authenticatedConvert.k19")
            : msg.includes("Insufficient wallet SAK")
              ? t("_authenticatedConvert.k20")
              : msg || t("_authenticatedConvert.k21"),
        );
      } else {
        toast.error(msg || t("_authenticatedConvert.k22"));
      }
    },
  });

  function submit() {
    if (mutation.isPending) return;
    if (!qty || qty <= 0) {
      toast.error(t("_authenticatedConvert.k23"));
      return;
    }
    if (mode === "buy" && !landId) {
      toast.error(t("_authenticatedConvert.k24"));
      return;
    }
    if (mode === "sell" && !holdingId) {
      toast.error(t("_authenticatedConvert.k25"));
      return;
    }
    setSuccess(null);
    mutation.mutate();
  }

  const buyTotal = qty * (price ?? 0);

  return (
    <PortalShell title={t("_authenticatedConvert.k10")}>
      {success ? (
        <SuccessReceipt
          result={success}
          mode={mode}
          price={price}
          onReset={() => {
            setSuccess(null);
            setAmount("");
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatsCard
              title={t("_authenticatedConvert.k11")}
              value={price != null ? fmtUSD(price) : "…"}
              subtitle={
                config ? t("convert.m1", { v: fmtNum(config.sak_to_gold_ratio, 4) }) : undefined
              }
              icon={ArrowLeftRight}
              variant="gold"
            />
            <StatsCard
              title={t("_authenticatedConvert.k12")}
              value={wallet ? fmtSAK(Number(wallet.sak_balance), 2) : "…"}
              icon={ShoppingCart}
              variant="info"
            />
            <StatsCard
              title={t("_authenticatedConvert.k13")}
              value={feePct != null ? `${fmtNum(feePct, 2)}%` : "…"}
              subtitle={t("_authenticatedConvert.k14")}
              icon={ArrowLeftRight}
              variant="warning"
            />
          </div>

          <div className="card-luxe mt-6 p-6">
            <div className="mb-6 flex rounded-xl bg-secondary p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("buy");
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "buy" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                <ArrowDownToLine className="ms-1 inline h-4 w-4" />{" "}
                {t("_authenticatedConvert.k10000")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("sell");
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "sell" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                <ArrowUpFromLine className="ms-1 inline h-4 w-4" />{" "}
                {t("_authenticatedConvert.k10001")}
              </button>
            </div>

            {mode === "buy" ? (
              <>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {t("_authenticatedConvert.k10000")}
                </label>
                <div className="mb-4">
                  <select
                    value={landId}
                    onChange={(e) => setLandId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  >
                    <option value="">{t("_authenticatedConvert.k10002")}</option>
                    {lands.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title_ar} {t("_authenticatedConvert.k10003")}{" "}
                        {fmtNum(l.available_sak, 2)} SAK
                      </option>
                    ))}
                  </select>
                </div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {t("_authenticatedConvert.k10001")}
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                />
                {qty > 0 && price != null && (
                  <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{t("_authenticatedConvert.k1")}</span>
                      <span className="num font-bold text-gold">{fmtUSD(buyTotal)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{t("_authenticatedConvert.k2")}</span>
                      <span className="num font-bold text-foreground">{fmtNum(qty, 2)} SAK</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {t("_authenticatedConvert.k10002")}
                </label>
                <div className="mb-4">
                  <select
                    value={holdingId}
                    onChange={(e) => setHoldingId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  >
                    <option value="">{t("_authenticatedConvert.k3")}</option>
                    {availableHoldings.map(
                      (h: {
                        id: string;
                        sak_owned: number | string;
                        land?: { title_ar?: string } | null;
                      }) => (
                        <option key={h.id} value={h.id}>
                          {h.land?.title_ar ?? t("_authenticatedConvert.k26")}{" "}
                          {t("_authenticatedConvert.k10004")} {fmtNum(h.sak_owned, 2)} SAK
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {t("_authenticatedConvert.k10003")}
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                />
                {qty > maxSell && holdingId && maxSell > 0 && (
                  <p className="mt-2 text-xs font-semibold text-warning">
                    {t("_authenticatedConvert.k10005")}
                    {fmtNum(maxSell, 2)} SAK).
                  </p>
                )}
                {qty > 0 && price != null && (
                  <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{t("_authenticatedConvert.k4")}</span>
                      <span className="num font-bold text-foreground">{fmtUSD(qty * price)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        {t("_authenticatedConvert.k10006")}
                        {fmtNum(feePct ?? 0, 2)}%)
                      </span>
                      <span className="num font-semibold text-destructive">−{fmtUSD(sellFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 py-2">
                      <span className="text-muted-foreground">{t("_authenticatedConvert.k5")}</span>
                      <span className="num font-bold text-gold">
                        {sellNetUsd != null ? fmtUSD(sellNetUsd) : "…"}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="bg-gold-gradient mt-6 w-full rounded-xl px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {mutation.isPending
                ? t("_authenticatedConvert.k27")
                : mode === "buy"
                  ? t("_authenticatedConvert.k28")
                  : t("_authenticatedConvert.k29")}
            </button>
          </div>
        </>
      )}
    </PortalShell>
  );
}

function SuccessReceipt({
  result,
  mode,
  price,
  onReset,
}: {
  result: Record<string, unknown>;
  mode: "buy" | "sell";
  price: number | null;
  onReset: () => void;
}) {
  const receipt = (result?.receipt ?? {}) as Record<string, unknown>;
  const order = (result?.order ?? {}) as Record<string, unknown>;
  const paymentRequest = (result?.payment_request ?? {}) as Record<string, unknown>;

  const sakQty = (receipt?.sakAmount ??
    order?.sak_quantity ??
    order?.sakQuantity ??
    (result as { sakAmount?: number }).sakAmount ??
    null) as number | string | null;
  const totalUsd = ((receipt?.totalCostSak as number | undefined) ??
    (order?.total_usd as number | undefined) ??
    null) as number | null;

  return (
    <div className="card-luxe p-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
        <ArrowLeftRight className="h-7 w-7 text-success" />
      </div>
      <h2 className="text-lg font-bold text-foreground">
        {mode === "buy" ? t("_authenticatedConvert.k30") : t("_authenticatedConvert.k31")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "buy" ? t("_authenticatedConvert.k32") : t("_authenticatedConvert.k33")}
      </p>

      <div className="mx-auto mt-6 max-w-sm space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
        {sakQty != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("_authenticatedConvert.k6")}</span>
            <span className="num font-bold text-gold">{fmtSAK(sakQty, 2)}</span>
          </div>
        )}
        {totalUsd != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("_authenticatedConvert.k7")}</span>
            <span className="num font-bold text-foreground">{fmtUSD(totalUsd)}</span>
          </div>
        )}
        {price != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("_authenticatedConvert.k8")}</span>
            <span className="num font-bold text-foreground">{fmtUSD(price)}</span>
          </div>
        )}
        {paymentRequest && typeof paymentRequest === "object" && "status" in paymentRequest && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("_authenticatedConvert.k9")}</span>
            <span className="num font-bold text-warning">{String(paymentRequest.status)}</span>
          </div>
        )}
      </div>

      {order && typeof order === "object" && "id" in order && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("_authenticatedConvert.k10007")}{" "}
          <span className="num">{String((order as { id: string }).id)}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/transactions"
          className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("_authenticatedConvert.k10004")}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-bold text-foreground"
        >
          {t("_authenticatedConvert.k10005")}
        </button>
      </div>
    </div>
  );
}
