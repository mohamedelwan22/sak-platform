import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/PublicLayout";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";

const forgotPasswordSchema = z.object({
  email: z.string().email(t("authForgot-password.k1")),
});

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSubmitted(true);
      toast.success(t("authForgot-password.k2"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("authForgot-password.k3");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Logo />
          </div>
          <div className="card-luxe gold-ring p-8 text-center">
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
              {t("authForgot-password.k10000")}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {t("authForgot-password.k10001")}
              {t("authForgot-password.k10002")}
            </p>
            <Link
              to="/auth"
              className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t("authForgot-password.k10003")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>
        <div className="card-luxe gold-ring p-8">
          <div className="mb-6 text-center">
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
              {t("authForgot-password.k10004")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("authForgot-password.k10005")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("authForgot-password.k10006")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="example@email.com"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-gold"
                dir="ltr"
                autoComplete="email"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
            >
              {isLoading ? t("authForgot-password.k4") : t("authForgot-password.k5")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="text-sm text-muted-foreground transition-colors hover:text-gold"
            >
              {t("authForgot-password.k10007")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
