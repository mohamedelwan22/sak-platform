import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/PublicLayout";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, t("authReset-password.k8"))
      .regex(/[A-Z]/, t("authReset-password.k9"))
      .regex(/[a-z]/, t("authReset-password.k10"))
      .regex(/[0-9]/, t("authReset-password.k11"))
      .regex(/[^A-Za-z0-9]/, t("authReset-password.k12")),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t("authReset-password.k13"),
    path: ["confirmPassword"],
  });

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: z.object({
    token: z.string(),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setIsSubmitted(true);
      toast.success(t("authReset-password.k14"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("authReset-password.k15");
      setErrors({ general: message });
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
              {t("authReset-password.k10000")}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {t("authReset-password.k10001")}
            </p>
            <Link
              to="/auth"
              className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              {t("authReset-password.k10002")}
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
              {t("authReset-password.k10003")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("authReset-password.k1")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.general && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("authReset-password.k10004")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="••••••••••"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-gold"
                dir="ltr"
                autoComplete="new-password"
                autoFocus
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t("authReset-password.k10005")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="••••••••••"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none transition-colors focus:border-gold"
                dir="ltr"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="rounded-xl bg-muted/30 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("authReset-password.k2")}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>{t("authReset-password.k3")}</li>
                <li>{t("authReset-password.k4")}</li>
                <li>{t("authReset-password.k5")}</li>
                <li>{t("authReset-password.k6")}</li>
                <li>{t("authReset-password.k7")}</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
            >
              {isLoading ? t("authReset-password.k16") : t("authReset-password.k17")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="text-sm text-muted-foreground transition-colors hover:text-gold"
            >
              {t("authReset-password.k10006")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
