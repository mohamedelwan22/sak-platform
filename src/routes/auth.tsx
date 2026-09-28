import { createFileRoute, useNavigate, useLocation, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/PublicLayout";
import { heroLand } from "@/lib/images";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { setPendingAccountType } from "@/lib/pendingAccountType";
import type { AccountType } from "@/types";
import { t } from "@/i18n";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: t("auth.k6") }, { name: "description", content: t("auth.k7") }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [browsingType, setBrowsingType] = useState(false);
  const { isAuthenticated, isInitialized, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/auth" && isInitialized && !isLoading && isAuthenticated) {
      navigate({ to: user?.broker ? "/broker" : "/dashboard", replace: true });
    }
  }, [location.pathname, isInitialized, isLoading, isAuthenticated, user, navigate]);

  if (location.pathname !== "/auth") {
    return <Outlet />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden lg:block">
        <img
          src={heroLand}
          alt=""
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-navy-deep/70" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo />
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-bold text-white">
              {t("auth.k10000")}
              <br />
              <span className="text-gold-gradient">{t("auth.k1")}</span>
            </h2>
            <p className="mt-4 max-w-sm text-white/70">{t("auth.k10001")}</p>
          </div>
          <p className="text-xs text-white/50">SAK100 — Secure Asset Keys</p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8 flex rounded-xl bg-secondary p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m === "register") {
                    setAccountType(null);
                    setBrowsingType(false);
                  }
                  setMode(m);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${mode === m ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "login" ? t("auth.k8") : t("auth.k9")}
              </button>
            ))}
          </div>
          {mode === "login" ? (
            <LoginForm />
          ) : accountType === null || browsingType ? (
            <AccountTypeStep
              selected={accountType}
              onSelect={(t) => {
                setAccountType(t);
                setBrowsingType(false);
              }}
            />
          ) : (
            <RegisterForm
              accountType={accountType}
              onBack={() => setBrowsingType(true)}
              onDone={() => setMode("login")}
            />
          )}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            {t("auth.k10000")}{" "}
            <Link to="/" className="text-gold hover:underline">
              {t("auth.k10002")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-gold";

const accountTypes: Array<{
  value: AccountType;
  title: string;
  description: string;
}> = [
  {
    value: "investor",
    title: t("auth.k10"),
    description: t("auth.k11"),
  },
  {
    value: "broker",
    title: t("auth.k12"),
    description: t("auth.k13"),
  },
];

function AccountTypeStep({
  selected,
  onSelect,
}: {
  selected: AccountType | null;
  onSelect: (type: AccountType) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("auth.k2")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.k3")}</p>
      </div>
      <div className="grid gap-4">
        {accountTypes.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              aria-pressed={isSelected}
              className={`group w-full rounded-2xl border p-5 text-start transition-colors focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none ${
                isSelected
                  ? "border-gold bg-gold/10 shadow-gold"
                  : "border-input bg-card hover:border-gold/50 hover:bg-secondary/60"
              }`}
            >
              <span
                className={`mb-1.5 block h-2.5 w-2.5 rounded-full border-2 ${
                  isSelected ? "border-gold bg-gold" : "border-muted-foreground/50"
                }`}
                aria-hidden="true"
              />
              <span className="block text-base font-bold text-foreground group-hover:text-gold">
                {option.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground/70">
        {t("auth.k10003")}
        {t("auth.k10004")}
      </p>
    </div>
  );
}

function GoogleDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground/60" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      {t("auth.k10005")}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string | null)?.trim() ?? "";
    const password = (fd.get("password") as string | null) ?? "";

    if (!email || !password) {
      toast.error(t("auth.k14"));
      return;
    }

    setLoading(true);
    try {
      const outcome = await login({ email, password });
      if (outcome === "verification_required") {
        navigate({ to: "/auth/verify-email" });
        return;
      }
      // Authenticated users are routed by the AuthPage effect to /broker or /dashboard
      // based on their broker status.
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("Invalid") ||
        message.includes("credentials") ||
        message.includes("invalid")
      ) {
        toast.error(t("auth.k15"));
      } else if (message.includes("locked")) {
        toast.error(t("auth.k16"));
      } else {
        toast.error(message || t("auth.k17"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GoogleSignInButton text="continue_with" />
      <GoogleDivider />
      <h1 className="text-2xl font-bold text-foreground">{t("auth.k4")}</h1>
      <div>
        <label htmlFor="l-email" className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("auth.k10006")}
        </label>
        <input
          id="l-email"
          name="email"
          type="text"
          required
          className={`num ${inputCls}`}
          dir="ltr"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="l-pass" className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("auth.k10007")}
        </label>
        <input
          id="l-pass"
          name="password"
          type="password"
          required
          className={inputCls}
          dir="ltr"
          autoComplete="current-password"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <input type="checkbox" name="remember" className="accent-[var(--gold)]" />
          {t("auth.k10008")}
        </label>
        <Link to="/auth/forgot-password" className="font-semibold text-gold hover:underline">
          {t("auth.k10009")}
        </Link>
      </div>
      <button
        disabled={loading}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? t("auth.k18") : t("auth.k19")}
      </button>
    </form>
  );
}

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, t("auth.k20")).max(100),
    lastName: z.string().trim().min(2, t("auth.k21")).max(100),
    email: z.string().trim().email(t("auth.k22")).max(255),
    phone: z.string().optional(),
    password: z
      .string()
      .min(10, t("auth.k23"))
      .regex(/[A-Z]/, t("auth.k24"))
      .regex(/[a-z]/, t("auth.k25"))
      .regex(/[0-9]/, t("auth.k26"))
      // eslint-disable-next-line no-useless-escape
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, t("auth.k27")),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: t("auth.k28") }) }),
  })
  .refine((d) => d.password === d.confirm, {
    message: t("auth.k29"),
    path: ["confirm"],
  });

function RegisterForm({
  accountType,
  onBack,
  onDone,
}: {
  accountType: AccountType;
  onBack: () => void;
  onDone: () => void;
}) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = registerSchema.safeParse({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      phone: fd.get("phone") || undefined,
      password: fd.get("password"),
      confirm: fd.get("confirm"),
      terms: fd.get("terms") === "on",
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      const outcome = await register({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone || undefined,
        accountType,
      });
      if (outcome === "verification_required") {
        if (accountType === "broker") setPendingAccountType("broker");
        navigate({ to: "/auth/verify-email" });
        return;
      }
      if (accountType === "broker") {
        navigate({ to: "/broker" });
        return;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already") || message.includes("exists")) {
        toast.error(t("auth.k30"));
      } else {
        toast.error(message || t("auth.k31"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-gold"
      >
        →<span>{t("auth.k5")}</span>
      </button>
      {accountType === "investor" ? (
        <>
          <GoogleSignInButton text="signin_with" />
          <GoogleDivider />
        </>
      ) : null}
      <h1 className="text-2xl font-bold text-foreground">
        {accountType === "broker" ? t("auth.k32") : t("auth.k33")}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-first" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t("authLabels.m1")}
          </label>
          <input id="r-first" name="firstName" required maxLength={100} className={inputCls} />
        </div>
        <div>
          <label htmlFor="r-last" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t("authLabels.m2")}
          </label>
          <input id="r-last" name="lastName" required maxLength={100} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="r-email" className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("authLabels.m3")}
        </label>
        <input
          id="r-email"
          name="email"
          type="email"
          required
          className={`num ${inputCls}`}
          dir="ltr"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="r-phone" className="mb-1.5 block text-sm font-semibold text-foreground">
          {t("authLabels.m4")}
        </label>
        <input
          id="r-phone"
          name="phone"
          type="tel"
          className={`num ${inputCls}`}
          dir="ltr"
          autoComplete="tel"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-pass" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t("authLabels.m5")}
          </label>
          <input
            id="r-pass"
            name="password"
            type="password"
            required
            className={inputCls}
            dir="ltr"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="r-confirm" className="mb-1.5 block text-sm font-semibold text-foreground">
            {t("authLabels.m6")}
          </label>
          <input
            id="r-confirm"
            name="confirm"
            type="password"
            required
            className={inputCls}
            dir="ltr"
            autoComplete="new-password"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("authLabels.m7")}</p>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" required className="mt-1 accent-[var(--gold)]" />
        {t("authLabels.m8")}
      </label>
      <button
        disabled={loading}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? t("auth.k34") : t("auth.k35")}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {t("authLabels.m9")}{" "}
        <button type="button" onClick={onDone} className="font-semibold text-gold hover:underline">
          {t("authLabels.m10")}
        </button>
      </p>
    </form>
  );
}
