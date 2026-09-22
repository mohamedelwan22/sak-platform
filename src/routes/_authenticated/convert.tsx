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
        if (!landId) throw new Error("اختر الأصل الذي تريد شراء SAK منه");
        if (price == null || buyTotal <= 0) throw new Error("السعر اللحظي غير متاح حالياً");
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
        toast.success("تم إرسال طلب الاستثمار بنجاح — يرجى مراجعة طلبك في صفحة طلبات الاستثمار");
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["holdings"] });
        queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
        navigate({ to: "/investment-requests/$id", params: { id: created.id } });
      } else {
        setSuccess(res.data.data ?? res.data);
        toast.success("تم إنشاء طلب البيع بنجاح");
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
            ? "لديك طلب استثمار نشط بالفعل على هذا الأصل — تابعه من صفحة طلبات الاستثمار"
            : msg.includes("Insufficient wallet SAK")
              ? "رصيد SAK غير كافٍ في محفظتك لإكمال هذه العملية"
              : msg || "حدث خطأ أثناء إرسال طلب الاستثمار",
        );
      } else {
        toast.error(msg || "حدث خطأ أثناء تنفيذ العملية");
      }
    },
  });

  function submit() {
    if (mutation.isPending) return;
    if (!qty || qty <= 0) {
      toast.error("أدخل كمية صحيحة من SAK");
      return;
    }
    if (mode === "buy" && !landId) {
      toast.error("اختر الأصل الذي تريد شراء SAK منه");
      return;
    }
    if (mode === "sell" && !holdingId) {
      toast.error("اختر الحيازة التي تريد بيعها");
      return;
    }
    setSuccess(null);
    mutation.mutate();
  }

  const buyTotal = qty * (price ?? 0);

  return (
    <PortalShell title="تحويل إلى SAK">
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
              title="سعر SAK"
              value={price != null ? fmtUSD(price) : "…"}
              subtitle={config ? `= ${fmtNum(config.sak_to_gold_ratio, 4)} جرام` : undefined}
              icon={ArrowLeftRight}
              variant="gold"
            />
            <StatsCard
              title="رصيد SAK المتاح"
              value={wallet ? fmtSAK(Number(wallet.sak_balance), 2) : "…"}
              icon={ShoppingCart}
              variant="info"
            />
            <StatsCard
              title="رسوم البيع"
              value={feePct != null ? `${fmtNum(feePct, 2)}%` : "…"}
              subtitle="مخصومة من إجمالي المبيع"
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
                <ArrowDownToLine className="ml-1 inline h-4 w-4" /> شراء (USD → SAK)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("sell");
                  setSuccess(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "sell" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                <ArrowUpFromLine className="ml-1 inline h-4 w-4" /> بيع (SAK → USD)
              </button>
            </div>

            {mode === "buy" ? (
              <>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  لماذا تحوّل؟ شراء SAK يحوّل أموالك إلى وحدات مدعومة بالذهب ولها أصول حقيقية.
                </label>
                <div className="mb-4">
                  <select
                    value={landId}
                    onChange={(e) => setLandId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  >
                    <option value="">اختر الأصل (قطعة أرض)…</option>
                    {lands.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title_ar} — متاح {fmtNum(l.available_sak, 2)} SAK
                      </option>
                    ))}
                  </select>
                </div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  كمية SAK
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
                      <span className="text-muted-foreground">القيمة بالدولار</span>
                      <span className="num font-bold text-gold">{fmtUSD(buyTotal)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">الوحدات</span>
                      <span className="num font-bold text-foreground">{fmtNum(qty, 2)} SAK</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  اختر الحيازة (الاستثمار) التي تريد بيع جزء منها
                </label>
                <div className="mb-4">
                  <select
                    value={holdingId}
                    onChange={(e) => setHoldingId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                  >
                    <option value="">اختر الحيازة…</option>
                    {availableHoldings.map(
                      (h: {
                        id: string;
                        sak_owned: number | string;
                        land?: { title_ar?: string } | null;
                      }) => (
                        <option key={h.id} value={h.id}>
                          {h.land?.title_ar ?? "حيازة"} — متاح {fmtNum(h.sak_owned, 2)} SAK
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  كمية SAK المطلوب بيعها
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
                    الكمية تتجاوز رصيد الحيازة المتاح ({fmtNum(maxSell, 2)} SAK).
                  </p>
                )}
                {qty > 0 && price != null && (
                  <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-sm">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">إجمالي المبيع</span>
                      <span className="num font-bold text-foreground">{fmtUSD(qty * price)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        رسوم السوق ({fmtNum(feePct ?? 0, 2)}%)
                      </span>
                      <span className="num font-semibold text-destructive">−{fmtUSD(sellFee)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 py-2">
                      <span className="text-muted-foreground">الصافي المستحق</span>
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
              {mutation.isPending ? "جارٍ التنفيذ…" : mode === "buy" ? "شراء SAK" : "إنشاء طلب بيع"}
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
        {mode === "buy" ? "تم التحويل إلى SAK بنجاح" : "تم إنشاء طلب البيع بنجاح"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "buy"
          ? "أُضيفت SAK إلى محفظتك وارتبطت بالأصل الحقيقي المختار."
          : "طلبك قيد المراجعة – سيصلك إشعار عند اكتمال التحويل."}
      </p>

      <div className="mx-auto mt-6 max-w-sm space-y-2 rounded-xl bg-secondary/60 p-4 text-sm">
        {sakQty != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">الوحدات</span>
            <span className="num font-bold text-gold">{fmtSAK(sakQty, 2)}</span>
          </div>
        )}
        {totalUsd != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">القيمة بالدولار</span>
            <span className="num font-bold text-foreground">{fmtUSD(totalUsd)}</span>
          </div>
        )}
        {price != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">سعر SAK</span>
            <span className="num font-bold text-foreground">{fmtUSD(price)}</span>
          </div>
        )}
        {paymentRequest && typeof paymentRequest === "object" && "status" in paymentRequest && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">حالة طلب السحب</span>
            <span className="num font-bold text-warning">{String(paymentRequest.status)}</span>
          </div>
        )}
      </div>

      {order && typeof order === "object" && "id" in order && (
        <p className="mt-3 text-xs text-muted-foreground">
          رقم الطلب: <span className="num">{String((order as { id: string }).id)}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/transactions"
          className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          عرض المعاملات
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-bold text-foreground"
        >
          عملية جديدة
        </button>
      </div>
    </div>
  );
}
