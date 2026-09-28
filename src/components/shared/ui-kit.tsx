import type { LucideIcon } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

/* ---------- StatusBadge ---------- */
const statusConfig: Record<string, { i18n: string; cls: string }> = {
  active: { i18n: "status.active", cls: "bg-success/15 text-success" },
  pending: { i18n: "status.pending", cls: "bg-warning/15 text-warning" },
  approved: { i18n: "status.approved", cls: "bg-success/15 text-success" },
  rejected: { i18n: "status.rejected", cls: "bg-destructive/15 text-destructive" },
  suspended: { i18n: "status.suspended", cls: "bg-destructive/15 text-destructive" },
  completed: { i18n: "status.completed", cls: "bg-info/15 text-info" },
  failed: { i18n: "status.failed", cls: "bg-destructive/15 text-destructive" },
  sold: { i18n: "status.sold", cls: "bg-muted text-muted-foreground" },
  sold_out: { i18n: "status.sold_out", cls: "bg-muted text-muted-foreground" },
  partially_sold: { i18n: "status.partially_sold", cls: "bg-gold/15 text-gold" },
  draft: { i18n: "status.draft", cls: "bg-muted text-muted-foreground" },
  frozen: { i18n: "status.frozen", cls: "bg-info/15 text-info" },
  closed: { i18n: "status.closed", cls: "bg-muted text-muted-foreground" },
  listed: { i18n: "status.listed", cls: "bg-info/15 text-info" },
  not_submitted: { i18n: "status.not_submitted", cls: "bg-muted text-muted-foreground" },
  matured: { i18n: "status.matured", cls: "bg-gold/15 text-gold" },
  processing: { i18n: "status.processing", cls: "bg-warning/15 text-warning" },
  cancelled: { i18n: "status.cancelled", cls: "bg-muted text-muted-foreground" },
  submitted: { i18n: "status.submitted", cls: "bg-info/15 text-info" },
  under_review: { i18n: "status.under_review", cls: "bg-warning/15 text-warning" },
  invested: { i18n: "status.invested", cls: "bg-success/15 text-success" },
  verified: { i18n: "status.verified", cls: "bg-success/15 text-success" },
  deactivated: { i18n: "status.deactivated", cls: "bg-destructive/15 text-destructive" },
  // Task 6: investment payment lifecycle
  payment_pending: { i18n: "status.payment_pending", cls: "bg-warning/15 text-warning" },
  proof_uploaded: { i18n: "status.proof_uploaded", cls: "bg-info/15 text-info" },
  payment_under_review: { i18n: "status.payment_under_review", cls: "bg-warning/15 text-warning" },
  payment_confirmed: { i18n: "status.payment_confirmed", cls: "bg-success/15 text-success" },
  payment_rejected: { i18n: "status.payment_rejected", cls: "bg-destructive/15 text-destructive" },
  // Broadcast lifecycle (BroadcastStatus enum)
  scheduled: { i18n: "status.broadcast_scheduled", cls: "bg-info/15 text-info" },
  sending: { i18n: "status.broadcast_sending", cls: "bg-warning/15 text-warning" },
  sent: { i18n: "status.broadcast_sent", cls: "bg-success/15 text-success" },
  // Delivery lifecycle (BroadcastDelivery enum)
  created: { i18n: "status.delivery_created", cls: "bg-muted text-muted-foreground" },
  queued: { i18n: "status.delivery_queued", cls: "bg-muted text-muted-foreground" },
  read: { i18n: "status.delivery_read", cls: "bg-info/15 text-info" },
  // Account state
  inactive: { i18n: "status.inactive", cls: "bg-muted text-muted-foreground" },
  // Land / project risk levels
  none: { i18n: "status.risk_none", cls: "bg-muted text-muted-foreground" },
  low: { i18n: "status.risk_low", cls: "bg-success/15 text-success" },
  medium: { i18n: "status.risk_medium", cls: "bg-warning/15 text-warning" },
  high: { i18n: "status.risk_high", cls: "bg-destructive/15 text-destructive" },
  // shadcn variant names reused as badge tones
  success: { i18n: "status.approved", cls: "bg-success/15 text-success" },
  warning: { i18n: "status.under_review", cls: "bg-warning/15 text-warning" },
  destructive: { i18n: "status.rejected", cls: "bg-destructive/15 text-destructive" },
  secondary: { i18n: "status.closed", cls: "bg-muted text-muted-foreground" },
};

/**
 * Neutral tone for any status the map does not know about. Rendering must never
 * depend on a lookup succeeding: an unknown enum value is a data condition, not
 * a reason to tear down the surrounding page.
 */
const FALLBACK_STATUS_CLS = "bg-muted text-muted-foreground";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cfg?.cls ?? FALLBACK_STATUS_CLS,
      )}
    >
      {label ?? (cfg ? t(cfg.i18n) : status)}
    </span>
  );
}

/* ---------- StatsCard ---------- */
const statsIconCls: Record<string, string> = {
  default: "bg-secondary text-muted-foreground",
  gold: "bg-gold/15 text-gold",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/15 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "default" | "gold" | "success" | "danger" | "warning" | "info";
  isLoading?: boolean;
}) {
  return (
    <div className={cn("card-luxe p-5", variant === "gold" && "gold-ring")}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <p className="num mt-1 truncate text-2xl font-bold text-foreground">{value}</p>
          )}
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-xl p-2.5", statsIconCls[variant] ?? statsIconCls.default)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-14 text-center">
      {Icon && <Icon className="mb-3 h-9 w-9 text-muted-foreground/60" />}
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- SectionHeading ---------- */
export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="mb-2 text-sm font-semibold tracking-widest text-gold">{eyebrow}</p>}
      <h2 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
    </div>
  );
}

/* ---------- Spinner ---------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("flex items-center justify-center py-12", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

/* ---------- Pagination (server-side) ---------- */
export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent disabled:opacity-40"
      >
        {t("sharedUi-kit.k10000")}
      </button>
      <span className="text-sm text-muted-foreground">
        {t("common.pageOf", { page, total: totalPages })}{" "}
        <span className="num font-bold text-foreground">{totalPages}</span>
        {typeof total === "number" && <> — {t("common.records", { v: total })}</>}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent disabled:opacity-40"
      >
        {t("sharedUi-kit.k10001")}
      </button>
    </div>
  );
}
