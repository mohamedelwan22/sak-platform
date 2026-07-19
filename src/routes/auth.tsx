import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/PublicLayout";
import { heroLand } from "@/lib/images";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — SAK100" },
      { name: "description", content: "سجّل الدخول أو أنشئ حساب مستثمر جديد في منصة SAK100." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isInitialized, isLoading, isAuthenticated, navigate]);

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
            <h2 className="max-w-md text-4xl leading-tight font-bold text-foreground">
              ملكية حقيقية،
              <br />
              <span className="text-gold-gradient">بقيمة ذهبية</span>
            </h2>
            <p className="mt-4 max-w-sm text-foreground/70">
              كل وحدة SAK تعادل 0.1 جرام ذهب وتمثل حصة موثقة في أصل حقيقي.
            </p>
          </div>
          <p className="text-xs text-foreground/50">SAK100 — Secure Asset Keys</p>
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
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${mode === m ? "bg-gold-gradient text-primary-foreground" : "text-muted-foreground"}`}
              >
                {m === "login" ? "تسجيل الدخول" : "حساب جديد"}
              </button>
            ))}
          </div>
          {mode === "login" ? <LoginForm /> : <RegisterForm onDone={() => setMode("login")} />}
          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            بالمتابعة أنت توافق على شروط الاستخدام وآلية الاستثمار.{" "}
            <Link to="/" className="text-gold hover:underline">
              العودة للرئيسية
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-gold";

function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));

    if (!email || !password) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);
    try {
      await login({ email, password });
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (
        message.includes("Invalid") ||
        message.includes("credentials") ||
        message.includes("invalid")
      ) {
        toast.error("بيانات الدخول غير صحيحة");
      } else if (message.includes("locked")) {
        toast.error("تم قفل الحساب مؤقتاً");
      } else {
        toast.error(message || "حدث خطأ أثناء تسجيل الدخول");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">مرحباً بعودتك</h1>
      <div>
        <label htmlFor="l-email" className="mb-1.5 block text-sm font-semibold text-foreground">
          البريد الإلكتروني
        </label>
        <input
          id="l-email"
          name="email"
          type="email"
          required
          className={`num ${inputCls}`}
          dir="ltr"
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="l-pass" className="mb-1.5 block text-sm font-semibold text-foreground">
          كلمة المرور
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
          تذكرني
        </label>
        <Link to="/auth/forgot-password" className="font-semibold text-gold hover:underline">
          نسيت كلمة المرور؟
        </Link>
      </div>
      <button
        disabled={loading}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
      </button>
    </form>
  );
}

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "الاسم قصير جداً").max(100),
    lastName: z.string().trim().min(2, "الاسم قصير جداً").max(100),
    email: z.string().trim().email("بريد إلكتروني غير صالح").max(255),
    phone: z.string().optional(),
    password: z
      .string()
      .min(10, "كلمة المرور 10 أحرف على الأقل")
      .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير")
      .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير")
      .regex(/[0-9]/, "يجب أن تحتوي على رقم")
      // eslint-disable-next-line no-useless-escape
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/, "يجب أن تحتوي على رمز خاص"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "الموافقة على الشروط إلزامية" }) }),
  })
  .refine((d) => d.password === d.confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirm"],
  });

function RegisterForm({ onDone }: { onDone: () => void }) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      await register({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone || undefined,
      });
      setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already") || message.includes("exists")) {
        toast.error("هذا البريد مسجل بالفعل");
      } else {
        toast.error(message || "حدث خطأ أثناء إنشاء الحساب");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <div className="card-luxe gold-ring p-8 text-center">
        <p className="text-lg font-bold text-gold">تم إنشاء الحساب بنجاح</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          يمكنك الآن تسجيل الدخول ببياناتك.
        </p>
        <button onClick={onDone} className="mt-6 text-sm font-bold text-gold hover:underline">
          الذهاب لتسجيل الدخول
        </button>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">أنشئ حساب مستثمر</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-first" className="mb-1.5 block text-sm font-semibold text-foreground">
            الاسم الأول
          </label>
          <input id="r-first" name="firstName" required maxLength={100} className={inputCls} />
        </div>
        <div>
          <label htmlFor="r-last" className="mb-1.5 block text-sm font-semibold text-foreground">
            اسم العائلة
          </label>
          <input id="r-last" name="lastName" required maxLength={100} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="r-email" className="mb-1.5 block text-sm font-semibold text-foreground">
          البريد الإلكتروني
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
          رقم الهاتف (اختياري)
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
            كلمة المرور
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
            تأكيد كلمة المرور
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
      <p className="text-xs text-muted-foreground">
        10 أحرف على الأقل، تتضمن حرفاً كبيراً وصغيراً ورقماً ورمز خاص.
      </p>
      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" required className="mt-1 accent-[var(--gold)]" />
        أوافق على شروط الاستخدام وآلية الاستثمار وسياسة الخصوصية
      </label>
      <button
        disabled={loading}
        className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? "جارٍ الإنشاء…" : "إنشاء الحساب"}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{" "}
        <button type="button" onClick={onDone} className="font-semibold text-gold hover:underline">
          سجّل الدخول
        </button>
      </p>
    </form>
  );
}
