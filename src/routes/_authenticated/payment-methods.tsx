import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Landmark,
  Wallet as WalletIcon,
  Star,
  Trash2,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDate } from "@/lib/format";
import {
  paymentMethodsApi,
  type PaymentMethodDto,
  type CreatePaymentMethodInput,
} from "@/api/paymentMethods.api";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/payment-methods")({
  component: PaymentMethodsPage,
});

const TYPE_LABELS: Record<string, string> = {
  bank_transfer: t("_authenticatedPayment-methods.k29"),
  card: t("_authenticatedPayment-methods.k30"),
  other: t("_authenticatedPayment-methods.k31"),
};

function PaymentMethodsPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<CreatePaymentMethodInput["type"]>("bank_transfer");
  const [label, setLabel] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [brand, setBrand] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payment-methods", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await paymentMethodsApi.list();
      return res.data.data;
    },
  });

  const methods: PaymentMethodDto[] = Array.isArray(data) ? data : [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["payment-methods", userId] });
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const input: CreatePaymentMethodInput = { type, label: label.trim() || undefined };
      if (type === "bank_transfer") {
        input.details = {
          ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}),
          ...(bankName.trim() ? { bankName: bankName.trim() } : {}),
          ...(iban.trim() ? { iban: iban.trim() } : {}),
          ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        };
      } else if (type === "card") {
        input.details = {
          ...(brand.trim() ? { brand: brand.trim() } : {}),
          ...(last4.trim() ? { last4: last4.trim() } : {}),
          ...(expiry.trim() ? { expiry: expiry.trim() } : {}),
          ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
        };
      } else {
        input.details = {
          ...(ownerName.trim() ? { ownerName: ownerName.trim() } : {}),
          ...(accountNumber.trim() ? { reference: accountNumber.trim() } : {}),
        };
      }
      return paymentMethodsApi.create(input);
    },
    onSuccess: () => {
      toast.success(t("_authenticatedPayment-methods.k32"));
      setShowCreate(false);
      setLabel("");
      setAccountNumber("");
      setBankName("");
      setIban("");
      setOwnerName("");
      setBrand("");
      setLast4("");
      setExpiry("");
      invalidate();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? t("_authenticatedPayment-methods.k33"));
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.setDefault(id),
    onSuccess: () => {
      toast.success(t("_authenticatedPayment-methods.k34"));
      invalidate();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? t("_authenticatedPayment-methods.k35"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.remove(id),
    onSuccess: () => {
      toast.success(t("_authenticatedPayment-methods.k36"));
      invalidate();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? t("_authenticatedPayment-methods.k37"));
    },
  });

  function submit() {
    if (type === "bank_transfer" && !accountNumber.trim() && !iban.trim()) {
      toast.error(t("_authenticatedPayment-methods.k38"));
      return;
    }
    if (type === "card" && !last4.trim()) {
      toast.error(t("_authenticatedPayment-methods.k39"));
      return;
    }
    createMutation.mutate();
  }

  return (
    <PortalShell title={t("_authenticatedPayment-methods.k8")}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("_authenticatedPayment-methods.k10000")}
          {t("_authenticatedPayment-methods.k10001")}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="bg-gold-gradient flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          <PlusCircle className="h-4 w-4" />
          {showCreate
            ? t("_authenticatedPayment-methods.k40")
            : t("_authenticatedPayment-methods.k41")}
        </button>
      </div>

      {showCreate && (
        <div className="card-luxe mb-6 p-6">
          <h2 className="mb-4 font-bold text-foreground">
            {t("_authenticatedPayment-methods.k1")}
          </h2>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("_authenticatedPayment-methods.k10002")}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CreatePaymentMethodInput["type"])}
              className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            >
              <option value="bank_transfer">{t("_authenticatedPayment-methods.k2")}</option>
              <option value="card">{t("_authenticatedPayment-methods.k3")}</option>
              <option value="other">{t("_authenticatedPayment-methods.k4")}</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("_authenticatedPayment-methods.k10003")}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("_authenticatedPayment-methods.k9")}
              className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
            />
          </div>

          {type === "bank_transfer" && (
            <>
              <Field
                label={t("_authenticatedPayment-methods.k10")}
                value={bankName}
                onChange={setBankName}
                placeholder={t("_authenticatedPayment-methods.k11")}
              />
              <Field
                label={t("_authenticatedPayment-methods.k12")}
                value={accountNumber}
                onChange={setAccountNumber}
                placeholder={t("_authenticatedPayment-methods.k13")}
              />
              <Field
                label={t("_authenticatedPayment-methods.k14")}
                value={iban}
                onChange={setIban}
                placeholder="IBAN"
              />
              <Field
                label={t("_authenticatedPayment-methods.k15")}
                value={ownerName}
                onChange={setOwnerName}
                placeholder={t("_authenticatedPayment-methods.k16")}
              />
            </>
          )}

          {type === "card" && (
            <>
              <Field
                label={t("_authenticatedPayment-methods.k17")}
                value={brand}
                onChange={setBrand}
                placeholder="Visa / Mastercard"
              />
              <Field
                label={t("_authenticatedPayment-methods.k18")}
                value={last4}
                onChange={(v) => setLast4(v.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="1234"
              />
              <Field
                label={t("_authenticatedPayment-methods.k19")}
                value={expiry}
                onChange={setExpiry}
                placeholder="12/29"
              />
              <Field
                label={t("_authenticatedPayment-methods.k20")}
                value={ownerName}
                onChange={setOwnerName}
                placeholder={t("_authenticatedPayment-methods.k21")}
              />
            </>
          )}

          {type === "other" && (
            <>
              <Field
                label={t("_authenticatedPayment-methods.k22")}
                value={accountNumber}
                onChange={setAccountNumber}
                placeholder={t("_authenticatedPayment-methods.k23")}
              />
              <Field
                label={t("_authenticatedPayment-methods.k24")}
                value={ownerName}
                onChange={setOwnerName}
                placeholder={t("_authenticatedPayment-methods.k25")}
              />
            </>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={createMutation.isPending}
            className="bg-gold-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {createMutation.isPending
              ? t("_authenticatedPayment-methods.k42")
              : t("_authenticatedPayment-methods.k43")}
          </button>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : !methods.length ? (
        <EmptyState
          icon={WalletIcon}
          title={t("_authenticatedPayment-methods.k26")}
          description={t("_authenticatedPayment-methods.k27")}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {methods.map((m) => {
            const Icon =
              m.type === "card" ? CreditCard : m.type === "bank_transfer" ? Landmark : WalletIcon;
            return (
              <div key={m.id} className="card-luxe p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-secondary p-2.5">
                      <Icon className="h-5 w-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {m.label || (TYPE_LABELS[m.type] ?? m.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[m.type] ?? m.type}
                      </p>
                    </div>
                  </div>

                  {m.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-gold">
                      <Star className="h-3 w-3" /> {t("_authenticatedPayment-methods.k10000")}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("_authenticatedPayment-methods.k5")}
                    </span>
                    <span className="num font-semibold text-foreground">{m.masked ?? "—"}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("_authenticatedPayment-methods.k6")}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      {m.is_verified ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />{" "}
                          {t("_authenticatedPayment-methods.k10001")}
                        </>
                      ) : (
                        t("_authenticatedPayment-methods.k44")
                      )}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("_authenticatedPayment-methods.k7")}
                    </span>
                    <span className="num text-muted-foreground">{fmtDate(m.created_at)}</span>
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  {!m.is_default && (
                    <button
                      type="button"
                      onClick={() => setDefaultMutation.mutate(m.id)}
                      disabled={setDefaultMutation.isPending}
                      className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground disabled:opacity-60"
                    >
                      {t("_authenticatedPayment-methods.k10004")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("_authenticatedPayment-methods.k45")))
                        deleteMutation.mutate(m.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-60"
                    aria-label={t("_authenticatedPayment-methods.k28")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-gold"
      />
    </div>
  );
}
