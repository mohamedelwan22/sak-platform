import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, LogOut, ShieldAlert } from "lucide-react";
import { t } from "@/i18n";
import { impersonationApi } from "@/api/impersonation.api";
import { impersonationStorage, type ImpersonationState } from "@/lib/impersonationStorage";
import { toast } from "sonner";

/**
 * Persistent, unmissable banner shown for the whole duration of an impersonation
 * session. It names the real administrator, the account being viewed, when the
 * session started, and offers a single obvious way back. It is rendered above all
 * other chrome in PortalShell so it cannot be scrolled out of view.
 */
export function ImpersonationBanner({ state }: { state: ImpersonationState }) {
  const navigate = useNavigate();
  const [ending, setEnding] = useState(false);

  const startedAt = new Date(state.startedAt).toLocaleString();

  async function handleExit() {
    const confirmed = window.confirm(t("impersonation.exitConfirm"));
    if (!confirmed) return;

    setEnding(true);
    try {
      // End server-side first so the session is genuinely revoked, then swap the
      // parked admin tokens back in. A failure here must not strand the operator.
      await impersonationApi.end();
      toast.success(t("impersonation.ended"));
    } catch {
      // Even if the call fails, restore the admin session locally; the server
      // will reject the impersonation token once its TTL lapses.
    } finally {
      impersonationStorage.end();
      setEnding(false);
      void navigate({ to: "/admin", replace: true });
      window.location.reload();
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="impersonation-banner"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b-2 border-destructive/40 bg-destructive/10 px-4 py-2.5 text-destructive-foreground backdrop-blur-xl"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-1.5 font-bold text-destructive">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {t("impersonation.bannerTitle")}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground/80">
            <span>
              <span className="font-semibold">{t("impersonation.adminLabel")}:</span>{" "}
              <span className="num">{state.adminEmail}</span>
            </span>
            <span>
              <span className="font-semibold">{t("impersonation.targetLabel")}:</span>{" "}
              <span className="num">{state.targetEmail}</span>{" "}
              <span className="opacity-70">({state.targetRole})</span>
            </span>
            <span>
              <span className="font-semibold">{t("impersonation.startedLabel")}:</span>{" "}
              <span className="num">{startedAt}</span>
            </span>
            {state.reason ? (
              <span>
                <span className="font-semibold">{t("impersonation.reasonLabel")}:</span> {state.reason}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExit}
        disabled={ending}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        {t("impersonation.exit")}
      </button>
    </div>
  );
}
