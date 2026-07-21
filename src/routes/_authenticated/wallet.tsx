import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Landmark } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, StatusBadge, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtSAK, fmtDateTime, fmtNum } from "@/lib/format";
import { profileApi } from "@/api/profile.api";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: wallet } = useWallet(userId);
  const { data: gold } = useQuery(goldQuery);
  const { data: config } = useQuery(configQuery);
  const price = sakPrice(gold, config);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");

  const { data: requests, refetch } = useQuery({
    queryKey: ["payment-requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.paymentRequests();
      return res.data.data;
    },
  });

  const kycApproved = profile?.kyc_status === "approved";

  return (
    <PortalShell title="محفظتي">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          title="رصيد SAK"
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          variant="gold"
          icon={Landmark}
        />
        <StatsCard
          title="القيمة بالدولار"
          value={wallet && price != null ? fmtUSD(Number(wallet.sak_balance) * price) : "…"}
          subtitle={price != null ? `سعر SAK الآن ${fmtUSD(price)}` : undefined}
        />
      </div>

      {!kycApproved && (
        <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm font-semibold text-warning">
          يجب اعتماد التحقق من الهوية (KYC) قبل الإيداع أو السحب.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-luxe p-6">
          <div className="mb-5 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("deposit")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === "deposit" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              <ArrowDownToLine className="ml-1 inline h-4 w-4" /> إيداع
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === "withdraw" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              <ArrowUpFromLine className="ml-1 inline h-4 w-4" /> سحب
            </button>
          </div>
          {tab === "deposit" ? (
            <DepositForm userId={userId} disabled={!kycApproved} price={price} onDone={refetch} />
          ) : (
            <WithdrawForm
              userId={userId}
              disabled={!kycApproved}
              balanceSak={wallet ? Number(wallet.sak_balance) : 0}
              price={price}
              hasPending={(requests ?? []).some(
                (r: { type: string; status: string }) =>
                  r.type === "withdrawal" && r.status === "pending",
              )}
              onDone={refetch}
            />
          )}
        </div>

        <div className="card-luxe p-6">
          <h2 className="mb-4 font-bold text-foreground">طلباتي</h2>
          {requests?.length ? (
            <ul className="space-y-3">
              {requests.map(
                (r: {
                  id: string;
                  type: string;
                  status: string;
                  usd_amount: string | number;
                  created_at: string;
                  rejection_reason?: string;
                  sak_amount?: string | number;
                }) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {r.type === "deposit" ? "إيداع" : "سحب"} —{" "}
                        <span className="num">{fmtUSD(Number(r.usd_amount))}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDateTime(r.created_at)}
                      </p>
                      {r.status === "rejected" && r.rejection_reason && (
                        <p className="mt-1 text-xs text-destructive">السبب: {r.rejection_reason}</p>
                      )}
                      {r.status === "approved" && r.sak_amount && (
                        <p className="num mt-1 text-xs text-success">
                          {fmtNum(Number(r.sak_amount), 2)} SAK
                        </p>
                      )}
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ),
              )}
            </ul>
          ) : (
            <EmptyState title="لا طلبات بعد" />
          )}
        </div>
      </div>
    </PortalShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-gold";

function DepositForm({
  userId,
  disabled,
  price,
  onDone,
}: {
  userId?: string;
  disabled: boolean;
  price: number | null;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(500);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("غير مسجل");
      if (amount < 10) throw new Error("الحد الأدنى للإيداع 10 دولار");
      if (file && file.size > 10 * 1024 * 1024) throw new Error("حجم الملف أكبر من 10MB");
      const formData = new FormData();
      formData.append("type", "deposit");
      formData.append("amount", String(amount));
      formData.append("currency", "USD");
      if (file) {
        formData.append("proof", file);
      }
      await profileApi.uploadPaymentProof(formData);
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب الإيداع — سيراجعه فريقنا قريباً");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/60 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-1 font-bold text-foreground">بيانات التحويل البنكي</p>
        <p className="num">IBAN: SA00 0000 0000 0000 0000 0000</p>
        <p>البنك: SAK100 Holding — SWIFT: SAKHSARI</p>
        <p className="mt-1 text-xs">حوّل المبلغ ثم أرفق إثبات التحويل أدناه.</p>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="dep-amount">
          المبلغ (USD)
        </label>
        <input
          id="dep-amount"
          type="number"
          min={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className={`num ${inputCls}`}
        />
        {price != null && amount > 0 && (
          <p className="num mt-1.5 text-xs text-gold">
            ≈ {fmtNum(amount / price, 2)} SAK بسعر اليوم
          </p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="dep-proof">
          إثبات التحويل (صورة أو PDF)
        </label>
        <input
          id="dep-proof"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-muted-foreground file:ml-3 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-foreground"
        />
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={disabled || mutation.isPending}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {mutation.isPending ? "جارٍ الإرسال…" : "إرسال طلب الإيداع"}
      </button>
    </div>
  );
}

function WithdrawForm({
  userId,
  disabled,
  balanceSak,
  price,
  hasPending,
  onDone,
}: {
  userId?: string;
  disabled: boolean;
  balanceSak: number;
  price: number | null;
  hasPending: boolean;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(100);
  const queryClient = useQueryClient();
  const maxUsd = price != null ? balanceSak * price : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("غير مسجل");
      if (hasPending) throw new Error("لديك طلب سحب قيد المراجعة بالفعل");
      if (amount < 10) throw new Error("الحد الأدنى للسحب 10 دولار");
      if (amount > maxUsd) throw new Error("المبلغ أكبر من رصيدك المتاح");
      await profileApi.createPaymentRequest({
        type: "withdrawal",
        usdAmount: amount,
        method: "bank_transfer",
      });
    },
    onSuccess: () => {
      toast.success("تم إرسال طلب السحب — سيُنفَّذ بعد موافقة الإدارة");
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
        يُحوَّل المبلغ بنفس وسيلة الإيداع (قاعدة مكافحة غسل الأموال)، ويُخصم من رصيد SAK بسعر لحظة
        الاعتماد.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="wd-amount">
          المبلغ (USD)
        </label>
        <input
          id="wd-amount"
          type="number"
          min={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className={`num ${inputCls}`}
        />
        <p className="num mt-1.5 text-xs text-muted-foreground">المتاح: {fmtUSD(maxUsd)}</p>
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={disabled || mutation.isPending || hasPending}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {hasPending
          ? "لديك طلب سحب معلّق"
          : mutation.isPending
            ? "جارٍ الإرسال…"
            : "إرسال طلب السحب"}
      </button>
    </div>
  );
}
