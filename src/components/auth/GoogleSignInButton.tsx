import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              shape?: string;
              text?: string;
              locale?: string;
              width?: number | string;
            },
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  text: "continue_with" | "signin_with";
}

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function GoogleSignInButton({ text }: GoogleSignInButtonProps) {
  const { googleSignIn } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    const spinner = document.createElement("span");
    spinner.className = "text-xs text-muted-foreground";
    spinner.textContent = "Loading…";
    if (containerRef.current) {
      containerRef.current.replaceChildren(spinner);
    }

    const render = () => {
      const google = window.google?.accounts?.id;
      if (!google || !containerRef.current) {
        setError(true);
        return;
      }

      google.initialize({
        client_id: clientId,
        auto_select: false,
        callback: async (response: { credential?: string }) => {
          const credential = response?.credential;
          if (!credential) return;
          try {
            const outcome = await googleSignIn(credential);
            if (outcome === "verification_required") {
              navigate({ to: "/auth/verify-email" });
              return;
            }
            // Authenticated users are routed by the AuthPage effect to /broker or
            // /dashboard based on their broker status.
          } catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (
              message.includes("already") ||
              message.includes("linked") ||
              message.includes("Google")
            ) {
              toast.error(message);
            } else {
              toast.error("تعذر تسجيل الدخول باستخدام Google");
            }
          }
        },
      });

      google.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        locale: "ar",
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => {
      if (containerRef.current) containerRef.current.replaceChildren();
      setError(true);
    };
    document.head.appendChild(script);

    return () => {
      window.google?.accounts?.id.cancel();
    };
  }, [clientId, text, googleSignIn, navigate]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-input bg-card p-4 text-center text-sm text-muted-foreground">
        تسجيل الدخول عبر Google غير مُفعّل حالياً.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="flex justify-center [&_iframe]:!rounded-xl" />
      {error && (
        <p className="text-center text-xs text-destructive">
          تعذر تحميل زر Google. يرجى المحاولة لاحقاً.
        </p>
      )}
    </div>
  );
}
