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

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-gold";

const METHODS = [
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
  { value: "wallet", label: "محفظة" },
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
  const feePercent = Number(catalog?.sell_fee_percent ?? 0) || 0;

  function gotoBuy(landId: string) {
    setSelectedLandId(landId);
    setTab("buy");
  }

  return (
    <PortalShell title="سوق SAK">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="سعر SAK اللحظي"
          value={price != null ? fmtUSD(price) : "…"}
          subtitle="مربوط بأسعار الذهب العالمية"
          icon={Coins}
          variant="gold"
        />
        <StatsCard
          title="سعر جرام الذهب"
          value={goldPrice != null ? fmtUSD(goldPrice) : "…"}
          subtitle={catalog?.gold_updated_at ? fmtDateTime(catalog.gold_updated_at) : undefined}
          icon={Landmark}
          variant="info"
        />
        <StatsCard
          title="رسوم البيع"
          value={`${feePercent}%`}
          subtitle="تُخصم من قيمة الطلب عند البيع"
          icon={ArrowUpCircle}
          variant="warning"
        />
        <StatsCard
          title="رصيدك المتاح"
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          subtitle={wallet && Number(wallet.frozen_balance ?? 0) > 0 ? "جزء محجوز" : undefined}
          icon={Store}
          variant="success"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl bg-secondary p-1">
        <TabBtn active={tab === "catalog"} onClick={() => setTab("catalog")}>
          <Store className="ml-1 inline h-4 w-4" /> تصفح الأصول
        </TabBtn>
        <TabBtn active={tab === "buy"} onClick={() => setTab("buy")}>
          <ArrowDownCircle className="ml-1 inline h-4 w-4" /> شراء SAK
        </TabBtn>
        <TabBtn active={tab === "sell"} onClick={() => setTab("sell")}>
          <ArrowUpCircle className="ml-1 inline h-4 w-4" /> بيع SAK
        </TabBtn>
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
          <History className="ml-1 inline h-4 w-4" /> طلباتي
        </TabBtn>
      </div>

      {!kycApproved && tab !== "orders" && (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm font-semibold text-warning">
          يجب اعتماد التحقق من الهوية (KYC) قبل الشراء أو البيع.
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
            disabled={!kycApproved}
            selectedLandId={selectedLandId ?? void 0}
            onSelectLand={setSelectedLandId}
          />
        )}
        {tab === "sell" && (
          <SellPanel
            holdings={holdings ?? []}
            price={price}
            feePercent={feePercent}
            disabled={!kycApproved}
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
        title="لا أصول متاحة حالياً"
        description="تعود لاحقاً لمزيد من الفرص"
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
                alt={land.title_ar ?? "أصل"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0" style={{ background: "var(--gradient-navy)" }} />
              <div className="absolute top-3 right-3">
                <StatusBadge status={land.status} />
              </div>
              <div className="absolute right-3 bottom-3 left-3">
                <h3 className="truncate font-bold text-foreground">{land.title_ar ?? "أصل"}</h3>
                <p className="text-xs text-foreground/70">
                  {land.city}، {land.country}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">العائد المتوقع</span>
                <span className="num font-semibold text-gold">
                  {Number(land.expected_roi || 0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الاستحقاق</span>
                <span className="num font-semibold text-foreground">
                  {land.maturity_months} شهراً
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">المخزون المتاح</span>
                <span className="num font-semibold text-foreground">{fmtNum(available)} SAK</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs text-muted-foreground">سعر الوحدة</p>
                  <p className="num text-lg font-bold text-gold">
                    {price != null ? fmtUSD(price) : "…"}
                  </p>
                </div>
                <button
                  onClick={() => onBuy(land.id)}
                  disabled={!purchasable}
                  className="bg-gold-gradient shadow-gold rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
                >
                  {purchasable ? "شراء" : "غير متاح"}
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
      if (!land) throw new Error("اختر أصلاً للشراء");
      if (cost == null || cost <= 0) throw new Error("السعر اللحظي غير متاح حالياً");
      const res = await investmentRequestsApi.create({
        landId: land.id,
        amountUsd: cost,
        source: "marketplace",
      });
      return res.data.data as { id: string };
    },
    onSuccess: (created) => {
      toast.success("تم إرسال طلب الاستثمار بنجاح — يرجى مراجعة طلبك في صفحة طلبات الاستثمار");
      queryClient.invalidateQueries();
      navigate({ to: "/investment-requests/$id", params: { id: created.id } });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (e as Error)?.message ||
        "تعذر إرسال طلب الاستثمار";
      toast.error(
        msg.includes("active investment request")
          ? "لديك طلب استثمار نشط بالفعل على هذا الأصل — تابعه من صفحة طلبات الاستثمار"
          : msg.includes("Insufficient wallet SAK")
            ? "رصيد SAK غير كافٍ في محفظتك لإكمال هذه العملية"
            : msg,
      );
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-luxe p-6">
        <h2 className="mb-4 font-bold text-foreground">شراء SAK من الأصل المختار</h2>
        <div className="space-y-4">
          <div>
            <label
              className="mb-1.5 block text-sm font-semibold text-foreground"
              htmlFor="buy-land"
            >
              الأصل المطلوب
            </label>
            <select
              id="buy-land"
              value={land?.id ?? ""}
              onChange={(e) => onSelectLand(e.target.value || null)}
              className={inputCls}
            >
              <option value="">— اختر أصلاً —</option>
              {purchasableLands.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title_ar ?? "أصل"} — متاح {fmtNum(Number(l.available_sak))} SAK
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="buy-qty">
              عدد وحدات SAK
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
                المخزون المتاح: {fmtNum(maxQty)} SAK
              </p>
            )}
          </div>
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر الوحدة الآن</span>
              <span className="num font-semibold text-foreground">
                {price != null ? fmtUSD(price) : "…"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">التكلفة الإجمالية</span>
              <span className="num text-lg font-bold text-gold">
                {cost != null ? fmtUSD(cost) : "…"}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground/80">
              يتم إنشاء طلب استثمار يُمراجع من الإدارة قبل تنفيذه. تُستخدم أموالك من المحفظة وتُنقل
              الوحدات إلى حيازتك على الأصل بعد الاعتماد.
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled || mutation.isPending || !land || qty <= 0 || qty > maxQty}
            className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "جارٍ الإرسال…" : "إرسال طلب الاستثمار"}
          </button>
        </div>
      </div>
      <div className="card-luxe flex flex-col items-center justify-center p-6 text-center">
        <Store className="mb-3 h-10 w-10 text-gold/70" />
        <h3 className="font-bold text-foreground">شراء SAK عبر طلب استثمار</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          يتم إنشاء طلب استثمار يتم مراجعته من الإدارة قبل تنفيذه. تُستخدم أموالك من المحفظة مباشرةً
          وتُنقل الوحدات إلى حيازتك على الأصل بعد الاعتماد.
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
      toast.success("تم إنشاء طلب البيع — بانتظار موافقة الإدارة");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-luxe p-6">
        <h2 className="mb-4 font-bold text-foreground">بيع / تحويل من SAK</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-semibold text-foreground"
                htmlFor="sell-qty"
              >
                عدد وحدات SAK
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
                طريقة التحويل
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
              من حيازة محددة (اختياري)
            </label>
            <select
              id="sell-holding"
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className={inputCls}
            >
              <option value="">— الرصيد العام —</option>
              {holdings
                .filter((h) => h.status === "active")
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.land?.title_ar ?? "حياة أصل"} — {fmtNum(Number(h.sak_owned), 2)} SAK
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">القيمة الإجمالية</span>
              <span className="num font-semibold text-foreground">
                {price != null ? fmtUSD(qty * price) : "…"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رسوم المنصة ({feePercent}%)</span>
              <span className="num font-semibold text-destructive">
                {price != null ? `${fmtNum(feeSak, 4)} SAK — ${fmtUSD(feeSak * price)}` : "…"}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">الصافي المستحق</span>
              <span className="num text-lg font-bold text-gold">
                {proceeds != null ? fmtUSD(proceeds) : "…"}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground/80">
              يُخصم السعر وقت تقديم الطلب، ويُحوَّل المبلغ بعد موافقة الإدارة.
            </p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={disabled || mutation.isPending || qty <= 0}
            className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "جارٍ الإنشاء…" : "إنشاء طلب بيع"}
          </button>
        </div>
      </div>
      <div className="card-luxe flex flex-col items-center justify-center p-6 text-center">
        <ArrowUpCircle className="mb-3 h-10 w-10 text-gold/70" />
        <h3 className="font-bold text-foreground">بيع بسعر مضمون عند الطلب</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          يُجمَّد عدد الوحدات فوراً ويُسعَّر الطلب بسعر السوق الحالي، ثم تُحوَّل العوائد نقدية بعد
          اعتماد الإدارة للمطابقة مع قواعد مكافحة غسل الأموال (AML).
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
        title="لا طلبات بعد"
        description="أوامر الشراء والبيع تظهر هنا لحظة إنشائها"
      />
    );

  return (
    <div className="card-luxe overflow-x-auto p-6">
      <h2 className="mb-4 font-bold text-foreground">سجل أوامري</h2>
      <table className="w-full min-w-xl text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 font-semibold">النوع</th>
            <th className="pb-2 font-semibold">الأصل</th>
            <th className="pb-2 font-semibold">الكمية</th>
            <th className="pb-2 font-semibold">السعر</th>
            <th className="pb-2 font-semibold">الرسوم</th>
            <th className="pb-2 font-semibold">الإجمالي</th>
            <th className="pb-2 font-semibold">الحالة</th>
            <th className="pb-2 font-semibold">التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.id} className="border-b border-border/50 last:border-0">
              <td className="py-3">
                <span
                  className={`font-bold ${o.type === "buy" ? "text-success" : "text-destructive"}`}
                >
                  {o.type === "buy" ? "شراء" : "بيع"}
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
          عرض سجل المعاملات الكامل
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
