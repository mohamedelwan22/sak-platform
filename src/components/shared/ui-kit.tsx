import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- StatusBadge ---------- */
const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: "نشط", cls: "bg-success/15 text-success" },
  pending: { label: "قيد المراجعة", cls: "bg-warning/15 text-warning" },
  approved: { label: "معتمد", cls: "bg-success/15 text-success" },
  rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
  suspended: { label: "موقوف", cls: "bg-destructive/15 text-destructive" },
  completed: { label: "مكتمل", cls: "bg-info/15 text-info" },
  failed: { label: "فشل", cls: "bg-destructive/15 text-destructive" },
  sold: { label: "مباع", cls: "bg-muted text-muted-foreground" },
  sold_out: { label: "نفد", cls: "bg-muted text-muted-foreground" },
  partially_sold: { label: "متاح جزئياً", cls: "bg-gold/15 text-gold" },
  draft: { label: "مسودة", cls: "bg-muted text-muted-foreground" },
  frozen: { label: "مجمدة", cls: "bg-info/15 text-info" },
  closed: { label: "مغلق", cls: "bg-muted text-muted-foreground" },
  listed: { label: "معروض للبيع", cls: "bg-info/15 text-info" },
  not_submitted: { label: "لم يُقدَّم", cls: "bg-muted text-muted-foreground" },
  matured: { label: "استحق", cls: "bg-gold/15 text-gold" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = statusConfig[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cfg.cls,
      )}
    >
      {label ?? cfg.label}
    </span>
  );
}

/* ---------- StatsCard ---------- */
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
  variant?: "default" | "gold";
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
          <div
            className={cn(
              "rounded-xl p-2.5",
              variant === "gold" ? "bg-gold/15 text-gold" : "bg-secondary text-muted-foreground",
            )}
          >
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
