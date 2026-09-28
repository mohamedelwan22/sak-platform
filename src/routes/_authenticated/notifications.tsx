import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner, Pagination } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/api/notifications.api";
import { t, getLanguage } from "@/i18n";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

interface NotificationItem {
  id: string;
  title: string;
  titleEn?: string | null;
  message: string;
  messageEn?: string | null;
  linkUrl?: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationsPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const lang = getLanguage();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", userId, page],
    enabled: !!userId,
    queryFn: async () => {
      const res = await notificationsApi.list({ userId, page, limit: 15 });
      return res.data.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-count"] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.markAsRead(id);
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await notificationsApi.markAllAsRead(userId);
    },
    onSuccess: invalidate,
  });

  const items: NotificationItem[] = Array.isArray(notifications?.data) ? notifications.data : [];
  const hasUnread = items.some((n) => !n.isRead);

  /** Render per the active language with the creator-language fallback. */
  const title = (n: NotificationItem) => (lang === "ar" ? n.title : (n.titleEn ?? n.title));
  const message = (n: NotificationItem) => (lang === "ar" ? n.message : (n.messageEn ?? n.message));

  return (
    <PortalShell title={t("notifications.pageTitle")}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            {t("notifications.totalCount", { v: fmtNum(notifications?.total ?? items.length) })}
          </span>
          {hasUnread && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-sm font-semibold text-gold hover:underline disabled:opacity-50"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>
        {isLoading ? (
          <Spinner />
        ) : !items.length ? (
          <EmptyState
            icon={Bell}
            title={t("notifications.emptyTitle")}
            description={t("notifications.emptyDescription")}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "card-luxe p-5 transition-colors hover:bg-secondary/60",
                  !n.isRead && "gold-ring",
                )}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground">{title(n)}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t(`notificationType.${n.type}`)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{message(n)}</p>
                    {n.linkUrl && (
                      <a
                        href={n.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold hover:bg-gold/20"
                      >
                        {t("notifications.cta")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground/60">{fmtDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        {notifications && notifications.totalPages > 1 && (
          <Pagination
            page={notifications.page}
            totalPages={notifications.totalPages}
            total={notifications.total}
            onPage={setPage}
          />
        )}
      </div>
    </PortalShell>
  );
}
