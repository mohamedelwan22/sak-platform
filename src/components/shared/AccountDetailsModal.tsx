import { useQuery } from "@tanstack/react-query";
import { X, Smartphone, ShieldCheck, FileCheck2, Mail, Calendar } from "lucide-react";
import { profileApi } from "@/api/profile.api";
import { useAuth } from "@/hooks/useAuth";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge, Spinner } from "./ui-kit";
import { t } from "@/i18n";
import { useEffect, useCallback } from "react";

interface AccountDetailsModalProps {
  onClose: () => void;
}

function InfoItem({
  icon: Icon,
  label,
  value,
  ltr,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  ltr?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3.5 sm:p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 text-gold" />
        <span>{label}</span>
      </p>
      <div
        dir={ltr ? "ltr" : undefined}
        className={`mt-1 text-sm font-bold text-foreground break-words text-start ${mono ? "num" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

export function AccountDetailsModal({ onClose }: AccountDetailsModalProps) {
  const { user } = useAuth();
  const { data: accountDetails, isLoading, error } = useQuery({
    queryKey: ["account-details", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await profileApi.accountDetails();
      return res.data.data;
    },
  });

  // Handle Escape key press
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent background scrolling while modal is open; restore previous overflow on unmount
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const getRoleLabel = (roleName?: string) => {
    if (!roleName) return "—";
    const map: Record<string, string> = {
      super_admin: t("_authenticatedSettings.k35"),
      admin: t("_authenticatedSettings.k36"),
      investor: t("_authenticatedSettings.k37"),
      client: t("_authenticatedSettings.k38"),
      support: t("_authenticatedSettings.k39"),
      broker: t("navigation.brokerPortal"),
    };
    return map[roleName] || roleName;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card-luxe flex max-h-[90vh] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-details-title"
      >
        {/* Header - Fixed & Sticky */}
        <div className="flex items-center justify-between border-b border-border/60 bg-card px-4 py-3.5 sm:px-6 sm:py-4 shrink-0">
          <div className="flex items-center gap-2.5 pe-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="account-details-title" className="text-base sm:text-lg font-bold text-foreground">
                {t("account.title")}
              </h2>
              {accountDetails?.accountNumber && (
                <p dir="ltr" className="num text-xs text-muted-foreground text-start">
                  {accountDetails.accountNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-secondary/80 text-foreground transition-colors hover:border-gold/50 hover:bg-secondary hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
            aria-label={t("account.close")}
            title={t("account.close")}
            type="button"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sidebar-scroll">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Spinner />
              <p className="text-xs text-muted-foreground">{t("account.loading")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-muted-foreground text-center">
                {(error as Error).message?.includes("404") ||
                (error as Error).message?.includes("not found")
                  ? t("errors.notFound")
                  : t("errors.generic")}
              </p>
            </div>
          ) : accountDetails ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <InfoItem
                  icon={Smartphone}
                  label={t("account.number")}
                  value={accountDetails.accountNumber}
                  ltr
                  mono
                />
              </div>
              <InfoItem
                icon={ShieldCheck}
                label={t("account.type")}
                value={getRoleLabel(accountDetails.role)}
              />
              <InfoItem
                icon={ShieldCheck}
                label={t("account.status")}
                value={<StatusBadge status={accountDetails.status} />}
              />
              <div className="sm:col-span-2">
                <InfoItem
                  icon={Mail}
                  label={t("account.email")}
                  value={accountDetails.email}
                  ltr
                />
              </div>
              <InfoItem
                icon={FileCheck2}
                label={t("account.emailVerified")}
                value={
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      accountDetails.emailVerified ? "text-success" : "text-warning"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        accountDetails.emailVerified ? "bg-success" : "bg-warning"
                      }`}
                    />
                    {accountDetails.emailVerified ? t("account.verified") : t("account.unverified")}
                  </span>
                }
              />
              <InfoItem
                icon={FileCheck2}
                label={t("account.kycStatus")}
                value={<StatusBadge status={accountDetails.kycStatus} />}
              />
              <div className="sm:col-span-2">
                <InfoItem
                  icon={Calendar}
                  label={t("account.registered")}
                  value={fmtDateTime(accountDetails.createdAt)}
                />
              </div>
              {accountDetails.lastLoginAt && (
                <div className="sm:col-span-2">
                  <InfoItem
                    icon={Calendar}
                    label={t("account.lastLogin")}
                    value={fmtDateTime(accountDetails.lastLoginAt)}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("errors.notFound")}
            </p>
          )}
        </div>

        {/* Footer - Fixed & Sticky */}
        <div className="border-t border-border/60 bg-card p-4 sm:px-6 shrink-0">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border/80 bg-secondary/80 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-gold/50 hover:bg-secondary hover:text-gold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            type="button"
          >
            {t("account.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
