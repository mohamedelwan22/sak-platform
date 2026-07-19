import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/PublicLayout";
import { useAuth } from "@/hooks/useAuth";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, "كلمة المرور يجب أن تكون 10 أحرف على الأقل")
      .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير")
      .regex(/[a-z]/, "كلمة المرور يجب أن تحتوي على حرف صغير")
      .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم")
      .regex(/[^A-Za-z0-9]/, "كلمة المرور يجب أن تحتوي على رمز خاص"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
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
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ، يرجى المحاولة مرة أخرى";
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
              تم إعادة التعيين بنجاح
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
            </p>
            <Link
              to="/auth"
              className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
            >
              تسجيل الدخول
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
              إعادة تعيين كلمة المرور
            </h2>
            <p className="text-sm text-muted-foreground">أدخل كلمة المرور الجديدة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.general && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                كلمة المرور الجديدة
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
                تأكيد كلمة المرور
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
              <p className="mb-2 text-xs font-medium text-muted-foreground">متطلبات كلمة المرور:</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• 10 أحرف على الأقل</li>
                <li>• حرف كبير واحد على الأقل</li>
                <li>• حرف صغير واحد على الأقل</li>
                <li>• رقم واحد على الأقل</li>
                <li>• رمز خاص واحد على الأقل</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gold-gradient shadow-gold w-full rounded-xl py-3.5 font-bold text-primary-foreground disabled:opacity-60"
            >
              {isLoading ? "جارٍ إعادة التعيين..." : "إعادة تعيين كلمة المرور"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/auth"
              className="text-sm text-muted-foreground transition-colors hover:text-gold"
            >
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
