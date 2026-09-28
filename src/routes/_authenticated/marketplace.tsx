import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Store, ArrowDownCircle, ArrowUpCircle, History, Coins, Landmark } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, StatusBadge, EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { fmtUSD, fmtSAK, fmtNum, fmtDateTime } from "@/lib/format";
import { landImage } from "@/lib/images";
import { profileApi } from "@/api/profile.api";
import { investmentRequestsApi } from "@/api/phase04.api";
import { marketplaceApi } from "@/api/marketplace.api";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-gold";

const METHODS = [
  { value: "bank_transfer", label: t("_authenticatedMarketplace.k35") },
  { value: "card", label: t("_authenticatedMarketplace.k36") },
  { value: "wallet", label: t("_authenticatedMarketplace.k37") },
];

type Tab = "catalog" | "buy" | "sell" | "orders";

function MarketplacePage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: wallet } = useWallet(userId);
  const [tab, setTab] = useState<Tab>("catalog");
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null);

  const kycApproved = profile?.kyc_status === "approved";

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["marketplace", "catalog"],
    enabled: !!userId,
    queryFn: async () => {
      const res = await marketplaceApi.getCatalog();
      return res.data.data;
    },
  });

  const { data: holdings } = useQuery({
    queryKey: ["holdings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.holdings();
      return res.data.data;
    },
  });

  const lands: LandCard[] = Array.isArray(catalog?.lands) ? catalog.lands : [];
  const price = Number(catalog?.price ?? 0) || null;
  const goldPrice = Number(catalog?.gram_price_usd ?? 0) || null;
  const ouncePrice = Number(catalog?.gold_price_per_ounce_usd ?? 0) || null;
  const feePercent = Number(catalog?.sell_fee_percent ?? 0) || 0;
  const priceStale = Boolean(catalog?.price_is_stale);
  // No valid market price → financial transactions are not allowed.
  const noValidPrice = !catalogLoading && price == null;
  const tradingDisabled = !kycApproved || noValidPrice;

  function gotoBuy(landId: string) {
    setSelectedLandId(landId);
    setTab("buy");
  }

  return (
    <PortalShell title={t("_authenticatedMarketplace.k24")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title={t("_authenticatedMarketplace.k25")}
          value={price != null ? fmtUSD(price) : "…"}
          subtitle={t("_authenticatedMarketplace.k26")}
          icon={Coins}
          variant="gold"
        />
        <StatsCard
          title={t("_authenticatedMarketplace.k27")}
          value={goldPrice != null ? fmtUSD(goldPrice) : "…"}
          subtitle={
            ouncePrice != null
              ? `${fmtUSD(ouncePrice)} ${t("common.perOunce")}${priceStale ? t("_authenticatedMarketplace.k38") : ""}`
              : priceStale
                ? t("_authenticatedMarketplace.k39")
                : catalog?.gold_updated_at
                  ? fmtDateTime(catalog.gold_updated_at)
                  : undefined
          }
          icon={Landmark}
          variant="info"
        />
        <StatsCard
          title={t("_authenticatedMarketplace.k28")}
          value={`${feePercent}%`}
          subtitle={t("_authenticatedMarketplace.k29")}
          icon={ArrowUpCircle}
          variant="warning"
        />
        <StatsCard
          title={t("_authenticatedMarketplace.k30")}
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          subtitle={
            wallet && Number(wallet.frozen_balance ?? 0) > 0
              ? t("_authenticatedMarketplace.k40")
              : undefined
          }
          icon={Store}
          variant="success"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl bg-secondary p-1">
        <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")}>
          <Store className="ms-1 inline h-4 w-4" /> {t("_authenticatedMarketplace.k10000")}
        </TabBtn>
        <TabBtn active={tab === "buy"} onClick={() => setTab("buy")}>
          <ArrowDownCircle className="ms-1 inline h-4 w-4" />{" "}
          {t("_authenticatedMarketplace.k10001")}
        </TabBtn>
        <TabBtn active={tab === "sell"} onClick={() => setTab("sell")}>
          <ArrowUpCircle className="ms-1 inline h-4 w-4" /> {t("_authenticatedMarketplace.k10002")}
        </TabBtn>
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
          <History className="ms-1 inline h-4 w-4" /> {t("_authenticatedMarketplace.k10003")}
        </TabBtn>
      </div>

      {!kycApproved && tab !== "orders" && (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm font-semibold text-warning">
          {t("_authenticatedMarketplace.k10000")}
        </p>
      )}

      {priceStale && !noValidPrice && (
        <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm font-semibold text-amber-400">
          {t("_authenticatedMarketplace.k10001")}
          {t("_authenticatedMarketplace.k10002")}
        </p>
      )}

      {noValidPrice && tab !== "orders" && tab !== "catalog" && (
        <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
          {t("_authenticatedMarketplace.k10003")}
        </p>
      )}

      <div className="mt-6">
        {tab === "catalog" && (
          <CatalogView lands={lands} price={price} loading={catalogLoading} onBuy={gotoBuy} />
        )}
        {tab === "buy" && (
          <BuyPanel
            lands={lands}
            price={price}
            disabled={tradingDisabled}
            selectedLandId={selectedLandId ?? void 0}
            onSelectLand={setSelectedLandId}
          />
        )}
        {tab === "sell" && (
          <SellPanel
            holdings={holdings ?? []}
            price={price}
            feePercent={feePercent}
            disabled={tradingDisabled}
          />
        )}
        {tab === "orders" && <OrdersView />}
      </div>
    </PortalShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-gold-gradient text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

interface LandCard {
  id: string;
  project_id: string | null;
  title_ar: string | null;
  description_ar: string | null;
  country: string | null;
  city: string | null;
  asset_type: string | null;
  area_m2: number | null;
  expected_roi: number | null;
  maturity_months: number | null;
  total_sak_inventory: number;
  available_sak: number;
  price_per_sak_usd: number | null;
  cover_image_url: string | null;
  status: string;
}

function CatalogView({
  lands,
  price,
  loading,
  onBuy,
}: {
  lands: LandCard[];
  price: number | null;
  loading: boolean;
  onBuy: (landId: string) => void;
}) {
  if (loading)
    return (
      <div className="px-2">
        <Spinner />
      </div>
    );

  if (!lands.length)
    return (
      <EmptyState
        icon={Store}
        title={t("_authenticatedMarketplace.k31")}
        description={t("_authenticatedMarketplace.k32")}
      />
    );

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {lands.map((land) => {
        const available = Number(land.available_sak) || 0;
        const purchasable = land.status === "active" || land.status === "partially_sold";
        return (
          <article key={land.id} className="card-luxe overflow-hidden">
            <div className="relative h-44">
              <img
                src={landImage(land.cover_image_url)}
                alt={land.title_ar ?? t("_authenticatedMarketplace.k41")}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "var(--gradient-navy)" }} />
              <div className="absolute top-3 start-3">
                <StatusBadge status={land.status} />
              </div>
              <div className="absolute start-3 bottom-3 end-3">
                <h3 className="truncate font-bold text-foreground">
                  {land.title_ar ?? t("_authenticatedMarketplace.k42")}
                </h3>
                <p className="text-xs text-foreground/70">
                  {land.city}
                  {t("_authenticatedMarketplace.k10004")} {land.country}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("_authenticatedMarketplace.k1")}</span>
                <span className="num font-semibold text-gold">
                  {Number(land.expected_roi || 0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("_authenticatedMarketplace.k2")}</span>
                <span className="num font-semibold text-foreground">
                  {land.maturity_months} {t("_authenticatedMarketplace.k10005")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("_authenticatedMarketplace.k3")}</span>
                <span className="num font-semibold text-foreground">{fmtNum(available)} SAK</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("_authenticatedMarketplace.k4")}
                  </p>
                  <p className="num text-lg font-bold text-gold">
                    {price != null ? fmtUSD(price) : "…"}
                  </p>
                </div>
                <button
                  onClick={() => onBuy(land.id)}
                  disabled={!purchasable}
                  className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
                >
                  {purchasable
                    ? t("_authenticatedMarketplace.k43")
                    : t("_authenticatedMarketplace.k44")}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function BuyPanel({
  lands,
  price,
  disabled,
  selectedLandId,
  onSelectLand,
}: {
  lands: LandCard[];
  price: number | null;
  disabled: boolean;
  selectedLandId?: string;
  onSelectLand: (id: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [qty, setQty] = useState(100);

  const purchasableLands = lands.filter(
    (l) => l.status === "active" || l.status === "partially_sold",
  );
  const land = purchasableLands.find((l) => l.id === selectedLandId) ?? null;
  const maxQty = land ? Number(land.available_sak) || 0 : 0;
  const cost = price != null && qty > 0 ? qty * price : null;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!land) throw new Error(t("_authenticatedMarketplace.k45"));
      if (cost == null || cost <= 0) throw new Error(t("_authenticatedMarketplace.k46"));
      const res = await investmentRequestsApi.create({
        landId: land.id,
        amountUsd: cost,
        source: "marketplace",
      });
      return res.data.data as { id: string };
    },
    onSuccess: (created) => {
      toast.success(t("_authenticatedMarketplace.k47"));
      queryClient.invalidateQueries();
      navigate({ to: "/investment-requests/$id", params: { id: created.id } });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (e as Error)?.message ||
        t("_authenticatedMarketplace.k48");
      toast.error(
        msg.includes("active investment request")
          ? t("_authenticatedMarketplace.k49")
          : msg.includes("Insufficient wallet SAK")
            ? t("_authenticatedMarketplace.k50")
            : msg,
      );
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-luxe p-6">
        <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedMarketplace.k5")}</h2>
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-foreground"
              htmlFor="buy-land"
            >
              {t("_authenticatedMarketplace.k10004")}
            </label>
            <select
              id="buy-land"
              value={land?.id ?? ""}
              onChange={(e) => onSelectLand(e.target.value || null)}
              className={inputCls}
            >
              <option value="">{t("_authenticatedMarketplace.k6")}</option>
              {purchasableLands.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title_ar ?? t("_authenticatedMarketplace.k51")}{" "}
                  {t("_authenticatedMarketplace.k10006")} {fmtNum(Number(l.available_sak))} SAK
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="buy-qty">
              {t("_authenticatedMarketplace.k10005")}
            </label>
            <input
              id="buy-qty"
              type="number"
              min={1}
              max={maxQty || undefined}
              value={qty}
              onChange={(e) => setQty(Math.max(0, Number(e.target.value)))}
              className={`num ${inputCls}`}
            />
            {land && maxQty > 0 && (
              <p className="num mt-1.5 text-xs text-muted-foreground">
                {t("_authenticatedMarketplace.k10007")} {fmtNum(maxQty)} SAK
              </p>
            )}
          </div>
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("_authenticatedMarketplace.k7")}</span>
              <span className="num font-semibold text-foreground">
                {price != null ? fmtUSD(price) : "…"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">{t("_authenticatedMarketplace.k8")}</span>
              <span className="num text-lg font-bold text-gold">
                {cost != null ? fmtUSD(cost) : "…"}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground/80">
              {t("_authenticatedMarketplace.k10006")}
              {t("_authenticatedMarketplace.k10007")}
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled || mutation.isPending || !land || qty <= 0 || qty > maxQty}
            className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending
              ? t("_authenticatedMarketplace.k52")
              : t("_authenticatedMarketplace.k53")}
          </button>
        </div>
      </div>
      <div className="card-luxe flex flex-col items-center justify-center p-6 text-center">
        <Store className="mb-3 h-10 w-10 text-gold/70" />
        <h3 className="font-bold text-foreground">{t("_authenticatedMarketplace.k9")}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("_authenticatedMarketplace.k10008")}
          {t("_authenticatedMarketplace.k10009")}
        </p>
      </div>
    </div>
  );
}

function SellPanel({
  holdings,
  price,
  feePercent,
  disabled,
}: {
  holdings: Array<{
    id: string;
    sak_owned: string | number;
    status: string;
    land?: { title_ar?: string } | null;
  }>;
  price: number | null;
  feePercent: number;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(50);
  const [method, setMethod] = useState(METHODS[0].value);
  const [holdingId, setHoldingId] = useState("");

  const feeSak = price != null ? Number(((qty * feePercent) / 100).toFixed(4)) : 0;
  const proceeds = price != null ? qty * price - feeSak * price : null;

  const mutation = useMutation({
    mutationFn: () =>
      marketplaceApi.sellSak({
        sakAmount: String(qty),
        method,
        holdingId: holdingId || null,
      }),
    onSuccess: () => {
      toast.success(t("_authenticatedMarketplace.k54"));
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-luxe p-6">
        <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedMarketplace.k10")}</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-semibold text-foreground"
                htmlFor="sell-qty"
              >
                {t("_authenticatedMarketplace.k10010")}
              </label>
              <input
                id="sell-qty"
                type="number"
                min={0.0001}
                step="any"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className={`num ${inputCls}`}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-semibold text-foreground"
                htmlFor="sell-method"
              >
                {t("_authenticatedMarketplace.k10011")}
              </label>
              <select
                id="sell-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputCls}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-foreground"
              htmlFor="sell-holding"
            >
              {t("_authenticatedMarketplace.k10012")}
            </label>
            <select
              id="sell-holding"
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className={inputCls}
            >
              <option value="">{t("_authenticatedMarketplace.k11")}</option>
              {holdings
                .filter((h) => h.status === "active")
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.land?.title_ar ?? t("_authenticatedMarketplace.k55")} —{" "}
                    {fmtNum(Number(h.sak_owned), 2)} SAK
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("_authenticatedMarketplace.k12")}</span>
              <span className="num font-semibold text-foreground">
                {price != null ? fmtUSD(qty * price) : "…"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("_authenticatedMarketplace.k10013")}
                {feePercent}%)
              </span>
              <span className="num font-semibold text-destructive">
                {price != null ? `${fmtNum(feeSak, 4)} SAK — ${fmtUSD(feeSak * price)}` : "…"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">{t("_authenticatedMarketplace.k13")}</span>
              <span className="num text-lg font-bold text-gold">
                {proceeds != null ? fmtUSD(proceeds) : "…"}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground/80">
              {t("_authenticatedMarketplace.k10014")}
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled || mutation.isPending || qty <= 0}
            className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending
              ? t("_authenticatedMarketplace.k56")
              : t("_authenticatedMarketplace.k57")}
          </button>
        </div>
      </div>
      <div className="card-luxe flex flex-col items-center justify-center p-6 text-center">
        <ArrowUpCircle className="mb-3 h-10 w-10 text-gold/70" />
        <h3 className="font-bold text-foreground">{t("_authenticatedMarketplace.k14")}</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("_authenticatedMarketplace.k10015")}
          {t("_authenticatedMarketplace.k10016")}
        </p>
      </div>
    </div>
  );
}

function OrdersView() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["marketplace", "orders"],
    queryFn: async () => {
      const res = await marketplaceApi.getMyOrders();
      return res.data.data;
    },
  });

  if (isLoading) return <Spinner />;

  const list: OrderRow[] = Array.isArray(orders?.data) ? orders.data : [];

  if (!list.length)
    return (
      <EmptyState
        icon={History}
        title={t("_authenticatedMarketplace.k33")}
        description={t("_authenticatedMarketplace.k34")}
      />
    );

  return (
    <div className="card-luxe overflow-x-auto p-6">
      <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedMarketplace.k15")}</h2>
      <table className="w-full min-w-xl text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k16")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k17")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k18")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k19")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k20")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k21")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k22")}</th>
            <th className="pb-2 font-semibold">{t("_authenticatedMarketplace.k23")}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} className="border-b border-border/50 last:border-0">
              <td className="py-3">
                <span
                  className={`font-bold ${o.type === "buy" ? "text-success" : "text-destructive"}`}
                >
                  {o.type === "buy"
                    ? t("_authenticatedMarketplace.k58")
                    : t("_authenticatedMarketplace.k59")}
                </span>
              </td>
              <td className="max-w-40 truncate py-3 text-muted-foreground">
                {o.land?.title_ar ?? "—"}
              </td>
              <td className="num py-3 font-semibold">{fmtNum(Number(o.sak_quantity), 2)} SAK</td>
              <td className="num py-3">{fmtUSD(Number(o.unit_price_usd))}</td>
              <td className="num py-3 text-muted-foreground">
                {Number(o.fee_sak) > 0 ? fmtNum(Number(o.fee_sak), 4) : "—"}
              </td>
              <td className="num py-3 font-bold text-gold">{fmtUSD(Number(o.total_usd))}</td>
              <td className="py-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="py-3 text-xs text-muted-foreground">
                {fmtDateTime(o.created_at)}
                {o.rejection_reason && (
                  <p className="mt-1 max-w-40 truncate text-destructive" title={o.rejection_reason}>
                    {o.rejection_reason}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/transactions" className="text-gold hover:underline">
          {t("_authenticatedMarketplace.k10017")}
        </Link>
      </p>
    </div>
  );
}

interface OrderRow {
  id: string;
  type: string;
  status: string;
  sak_quantity: string | number;
  unit_price_usd: string | number;
  fee_sak: string | number;
  total_usd: string | number;
  rejection_reason?: string | null;
  created_at: string;
  land?: { id: string; title_ar?: string; cover_image_url?: string } | null;
}
