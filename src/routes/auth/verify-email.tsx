import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/PublicLayout";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { consumePendingAccountType } from "@/lib/pendingAccountType";

export const Route = createFileRoute("/auth/verify-email")({
  head: () => ({
    meta: [
      { title: "تأكيد البريد الإلكتروني — SAK100" },
      { name: "description", content: "أدخل رمز التحقق المرسل إلى بريدك الإلكتروني لتأكيد حسابك." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { pendingEmail, isAuthenticated, isInitialized, verifyEmail, resendVerification, user } =
    useAuth();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpKeyRef = useRef(0);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const pendingType = consumePendingAccountType();
      navigate({
        to: pendingType === "broker" || user?.broker ? "/broker" : "/dashboard",
        replace: true,
      });
    }
  }, [isInitialized, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (pendingEmail) setEmail(pendingEmail);
  }, [pendingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  async function sendCode() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    setResending(true);
    try {
      await resendVerification(normalized);
      toast.success("تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني");
      setCooldown(60);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      toast.error(message || "تعذر إرسال الرمز، حاول مرة أخرى");
    } finally {
      setResending(false);
    }
  }

  async function onSubmitCode() {
    const normalized = email.trim().toLowerCase();
    if (!normalized || code.length !== 6) return;
    setLoading(true);
    try {
      await verifyEmail(normalized, code);
      toast.success("تم تأكيد البريد الإلكتروني بنجاح");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already been verified")) {
        navigate({ to: "/auth" });
        return;
      }
      toast.error(message || "رمز غير صحيح، حاول مرة أخرى");
      setCode("");
      otpKeyRef.current += 1;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>
        <div className="card-luxe gold-ring p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <svg
                className="h-8 w-8 text-gold"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2a2 2 0 00-2 2v1a2 2 0 01-2 2h-2a2 2 0 01-2-2v-1a2 2 0 00-2-2H4"
                />
              </svg>
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
              تأكيد البريد الإلكتروني
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى بريدك الإلكتروني. الرمز صالح لمدة 15
              دقيقة.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label
                htmlFor="v-email"
                className="mb-1.5 block text-sm font-semibold text-foreground"
              >
                البريد الإلكتروني
              </label>
              <input
                id="v-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-center font-semibold text-foreground outline-none transition-colors focus:border-gold"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex justify-center">
              <InputOTP
                key={otpKeyRef.current}
                maxLength={6}
                value={code}
                onChange={setCode}
                onComplete={onSubmitCode}
                disabled={loading}
                inputMode="numeric"
                pattern="^[0-9]+$"
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="button"
              onClick={onSubmitCode}
              disabled={loading || code.length !== 6}
              className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "جارٍ التأكيد…" : "تأكيد البريد"}
            </button>

            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  يمكنك إعادة إرسال الرمز بعد{" "}
                  <span className="font-bold text-gold">{cooldown}</span> ثانية
                </p>
              ) : (
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={resending}
                  className="text-sm font-semibold text-gold hover:underline disabled:opacity-60"
                >
                  {resending ? "جارٍ الإرسال…" : "إعادة إرسال الرمز"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground/70">
            لم تصلك رسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها.{" "}
            <Link to="/auth" className="text-gold hover:underline">
              العودة لتسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
