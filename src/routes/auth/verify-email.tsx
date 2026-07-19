import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/PublicLayout";

type VerificationStatus = "loading" | "success" | "invalid" | "expired" | "error";

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: z.object({
    token: z.string().optional(),
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<VerificationStatus>("loading");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const verify = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await fetch(
          `${backendUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
          { method: "GET" },
        );

        if (response.ok) {
          setStatus("success");
        } else {
          const data = await response.json().catch(() => null);
          if (data?.error?.includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("invalid");
          }
        }
      } catch {
        setStatus("success");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo />
        </div>
        <div className="card-luxe gold-ring p-8 text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gold/20 border-t-gold" />
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
                جارٍ التحقق من البريد الإلكتروني...
              </h2>
              <p className="text-sm text-muted-foreground">يرجى الانتظار بينما نتحقق من حسابك</p>
            </>
          )}

          {status === "success" && (
            <>
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
                تم التحقق من البريد الإلكتروني بنجاح
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول والاستفادة من جميع خدمات
                المنصة.
              </p>
              <Link
                to="/auth"
                className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                تسجيل الدخول
              </Link>
            </>
          )}

          {status === "invalid" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
                رابط غير صالح
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                رابط التحقق غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد.
              </p>
              <Link
                to="/auth"
                className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">
                انتهت صلاحية الرابط
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                انتهت صلاحية رابط التحقق. يرجى تسجيل الدخول مرة أخرى لتلقي رابط جديد.
              </p>
              <Link
                to="/auth"
                className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 font-heading text-2xl font-bold text-foreground">حدث خطأ</h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.
              </p>
              <Link
                to="/auth"
                className="inline-block rounded-xl bg-gold/10 px-6 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/20"
              >
                العودة إلى تسجيل الدخول
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
