import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { t } from "@/i18n";
import { impersonationApi } from "@/api/impersonation.api";
import { impersonationStorage, type ImpersonationState } from "@/lib/impersonationStorage";
import { tokenStorage } from "@/lib/tokenStorage";
import { toast } from "sonner";

/**
 * "Login as User" control for admin user-management screens.
 *
 * Requires an explicit reason (written to the audit trail) and a second
 * confirmation, because the operator is about to act with another person's
 * identity. The admin's own tokens are parked locally so "Return to Admin" is
 * always one click away and never lossy.
 */
export function ImpersonateButton({
  targetUserId,
  targetLabel,
  disabled,
  variant = "secondary",
}: {
  targetUserId: string;
  targetLabel: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [ttl, setTtl] = useState(15);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!reason.trim()) {
      toast.error(t("impersonation.reasonRequired"));
      return;
    }
    const confirmed = window.confirm(
      `${t("impersonation.confirmTitle")}\n\n${targetLabel}\n${t("impersonation.reasonLabel")}: ${reason.trim()}`,
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await impersonationApi.start({
        targetUserId,
        reason: reason.trim(),
        ttlMinutes: ttl,
      });
      const grant = res.data.data;

      const adminAccess = tokenStorage.getAccessToken();
      const adminRefresh = tokenStorage.getRefreshToken();
      if (!adminAccess || !adminRefresh) {
        toast.error(t("impersonation.failed"));
        return;
      }

      const state: ImpersonationState = {
        sessionId: grant.session.id,
        adminEmail: grant.session.adminEmail,
        targetUserId: grant.session.targetUserId,
        targetEmail: grant.session.targetEmail,
        targetName: grant.session.targetName,
        targetRole: grant.session.targetRole,
        reason: grant.session.reason,
        startedAt: new Date(grant.session.startedAt).toISOString(),
        expiresAt: new Date(grant.session.expiresAt).toISOString(),
      };
      impersonationStorage.begin(state, grant.accessToken, adminAccess, adminRefresh);
      toast.success(t("impersonation.started"));
      // Full reload guarantees every query, guard and layout rebinds to the
      // target identity rather than any cached admin-scoped state.
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        t("impersonation.failed");
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        data-testid="impersonate-open"
        className={
          variant === "primary"
            ? "flex items-center gap-1.5 rounded-lg bg-gold-gradient px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            : "flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-secondary/80 disabled:opacity-50"
        }
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        {t("impersonation.access")}
      </button>

      {open ? (
        <div className="card-luxe mt-3 space-y-3 p-4" data-testid="impersonate-panel">
          <div>
            <p className="text-sm font-bold text-foreground">{t("impersonation.loginAs")}</p>
            <p className="num mt-0.5 text-xs text-muted-foreground">{targetLabel}</p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-foreground">
              {t("impersonation.reasonLabel")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={t("impersonation.reasonPlaceholder")}
              data-testid="impersonate-reason"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-foreground">
              {t("impersonation.ttlLabel")}
            </span>
            <input
              type="number"
              min={1}
              max={60}
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="num mt-1 w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={start}
              disabled={busy}
              data-testid="impersonate-start"
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              {t("impersonation.loginAs")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
