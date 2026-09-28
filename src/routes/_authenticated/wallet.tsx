import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Landmark } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { StatsCard, StatusBadge, EmptyState } from "@/components/shared/ui-kit";
import { useSession, useProfile, useWallet } from "@/hooks/useAuth";
import { goldQuery, configQuery, sakPrice } from "@/lib/queries";
import { fmtUSD, fmtSAK, fmtDateTime, fmtNum } from "@/lib/format";
import { profileApi } from "@/api/profile.api";
import { paymentMethodsApi, type PaymentMethodDto } from "@/api/paymentMethods.api";
import { t } from "@/i18n";

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
    <PortalShell title={t("_authenticatedWallet.k7")}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title={t("_authenticatedWallet.k8")}
          value={wallet ? fmtSAK(Number(wallet.sak_balance)) : "…"}
          variant="gold"
          icon={Landmark}
        />
        <StatsCard
          title={t("_authenticatedWallet.k9")}
          value={wallet && price != null ? fmtUSD(Number(wallet.sak_balance) * price) : "…"}
          subtitle={price != null ? t("assetAllocation.m1", { v: fmtUSD(price) }) : undefined}
          variant="info"
        />
        <StatsCard
          title={t("_authenticatedWallet.k10")}
          value={
            wallet
              ? fmtUSD(
                  Math.max(
                    0,
                    Number(wallet.sak_balance) * (price ?? 0) - Number(wallet.frozen_balance ?? 0),
                  ),
                )
              : "…"
          }
          subtitle={
            wallet && Number(wallet.frozen_balance ?? 0) > 0
              ? t("wallet.m1", { v: fmtUSD(Number(wallet.frozen_balance)) })
              : undefined
          }
          variant="success"
        />
      </div>

      {!kycApproved && (
        <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4 text-sm font-semibold text-warning">
          {t("_authenticatedWallet.k10000")}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-luxe p-6">
          <div className="mb-5 flex rounded-xl bg-secondary p-1">
            <button
              onClick={() => setTab("deposit")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === "deposit" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              <ArrowDownToLine className="ms-1 inline h-4 w-4" /> {t("_authenticatedWallet.k10000")}
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${tab === "withdraw" ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
            >
              <ArrowUpFromLine className="ms-1 inline h-4 w-4" /> {t("_authenticatedWallet.k10001")}
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
          <h2 className="mb-4 font-bold text-foreground">{t("_authenticatedWallet.k1")}</h2>
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
                        {r.type === "deposit"
                          ? t("_authenticatedWallet.k12")
                          : t("_authenticatedWallet.k13")}{" "}
                        — <span className="num">{fmtUSD(Number(r.usd_amount))}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDateTime(r.created_at)}
                      </p>
                      {r.status === "rejected" && r.rejection_reason && (
                        <p className="mt-1 text-xs text-destructive">
                          {t("_authenticatedWallet.k10001")}
                          {r.rejection_reason}
                        </p>
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
            <EmptyState title={t("_authenticatedWallet.k11")} />
          )}
        </div>
      </div>
    </PortalShell>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-gold";

function usePaymentMethods(userId?: string) {
  return useQuery({
    queryKey: ["payment-methods", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await paymentMethodsApi.list();
      return (res.data.data ?? []) as PaymentMethodDto[];
    },
  });
}

function PaymentMethodSelector({
  methods,
  value,
  onChange,
}: {
  methods: PaymentMethodDto[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  if (methods.length === 0) return null;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">
        {t("_authenticatedWallet.k2")}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%23999%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat ${inputCls}`}
      >
        <option value="">{t("_authenticatedWallet.k3")}</option>
        {methods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.masked ?? m.label ?? m.type}
            {m.is_default ? t("_authenticatedWallet.k14") : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

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
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: methods = [] } = usePaymentMethods(userId);

  const defaultId = methods.find((m) => m.is_default)?.id ?? null;
  if (selectedMethodId === null && defaultId) {
    setSelectedMethodId(defaultId);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error(t("_authenticatedWallet.k15"));
      if (amount < 10) throw new Error(t("_authenticatedWallet.k16"));
      if (file && file.size > 10 * 1024 * 1024) throw new Error(t("_authenticatedWallet.k17"));
      const formData = new FormData();
      formData.append("type", "deposit");
      formData.append("amount", String(amount));
      formData.append("currency", "USD");
      if (selectedMethodId) {
        formData.append("paymentMethodId", selectedMethodId);
      }
      if (file) {
        formData.append("proof", file);
      }
      await profileApi.uploadPaymentProof(formData);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedWallet.k18"));
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/60 p-4 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-1 font-bold text-foreground">{t("_authenticatedWallet.k4")}</p>
        <p className="num">IBAN: SA00 0000 0000 0000 0000 0000</p>
        <p>{t("_authenticatedWallet.k5")}</p>
        <p className="mt-1 text-xs">{t("_authenticatedWallet.k6")}</p>
      </div>
      {methods.length > 0 ? (
        <PaymentMethodSelector
          methods={methods}
          value={selectedMethodId}
          onChange={setSelectedMethodId}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          <CreditCard className="h-4 w-4 shrink-0 text-gold" />
          {t("_authenticatedWallet.k10002")}{" "}
          <a
            href="/payment-methods"
            className="font-semibold text-gold underline underline-offset-2"
          >
            {t("_authenticatedWallet.k10002")}
          </a>
        </p>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="dep-amount">
          {t("_authenticatedWallet.k10003")}
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
            ≈ {fmtNum(amount / price, 2)} {t("_authenticatedWallet.k10003")}
          </p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="dep-proof">
          {t("_authenticatedWallet.k10004")}
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
        {mutation.isPending ? t("_authenticatedWallet.k19") : t("_authenticatedWallet.k20")}
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
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const maxUsd = price != null ? balanceSak * price : 0;
  const { data: methods = [] } = usePaymentMethods(userId);

  const defaultId = methods.find((m) => m.is_default)?.id ?? null;
  if (selectedMethodId === null && defaultId) {
    setSelectedMethodId(defaultId);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error(t("_authenticatedWallet.k21"));
      if (hasPending) throw new Error(t("_authenticatedWallet.k22"));
      if (amount < 10) throw new Error(t("_authenticatedWallet.k23"));
      if (amount > maxUsd) throw new Error(t("_authenticatedWallet.k24"));
      await profileApi.createPaymentRequest({
        type: "withdrawal",
        usdAmount: amount,
        method: selectedMethodId ? undefined : "bank_transfer",
        paymentMethodId: selectedMethodId,
      });
    },
    onSuccess: () => {
      toast.success(t("_authenticatedWallet.k25"));
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
        {t("_authenticatedWallet.k10005")}
        {t("_authenticatedWallet.k10006")}
      </p>
      {methods.length > 0 ? (
        <PaymentMethodSelector
          methods={methods}
          value={selectedMethodId}
          onChange={setSelectedMethodId}
        />
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
          <CreditCard className="h-4 w-4 shrink-0 text-gold" />
          {t("_authenticatedWallet.k10004")}{" "}
          <a
            href="/payment-methods"
            className="font-semibold text-gold underline underline-offset-2"
          >
            {t("_authenticatedWallet.k10007")}
          </a>
        </p>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-foreground" htmlFor="wd-amount">
          {t("_authenticatedWallet.k10008")}
        </label>
        <input
          id="wd-amount"
          type="number"
          min={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className={`num ${inputCls}`}
        />
        <p className="num mt-1.5 text-xs text-muted-foreground">
          {t("_authenticatedWallet.k10009")}
          {fmtUSD(maxUsd)}
        </p>
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={disabled || mutation.isPending || hasPending}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3 font-bold text-primary-foreground disabled:opacity-50"
      >
        {hasPending
          ? t("_authenticatedWallet.k26")
          : mutation.isPending
            ? t("_authenticatedWallet.k27")
            : t("_authenticatedWallet.k28")}
      </button>
    </div>
  );
}
