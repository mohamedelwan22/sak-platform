import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/api/notifications.api";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await notificationsApi.list({ userId });
      return res.data.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await notificationsApi.markAsRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await notificationsApi.markAllAsRead(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const items = notifications?.data ?? notifications;
  const hasUnread = Array.isArray(items) && items.some((n: { isRead: boolean }) => !n.isRead);

  return (
    <PortalShell title="الإشعارات">
      <div className="mx-auto max-w-2xl">
        {hasUnread && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => markAllRead.mutate()}
              className="text-sm font-semibold text-gold hover:underline"
            >
              تحديد الكل كمقروء
            </button>
          </div>
        )}
        {isLoading ? (
          <Spinner />
        ) : !Array.isArray(items) || !items.length ? (
          <EmptyState
            icon={Bell}
            title="لا إشعارات"
            description="ستصلك هنا تحديثات حسابك واستثماراتك"
          />
        ) : (
          <ul className="space-y-3">
            {items.map(
              (n: {
                id: string;
                title: string;
                message: string;
                isRead: boolean;
                createdAt: string;
              }) => (
                <li
                  key={n.id}
                  className={cn("card-luxe p-5 cursor-pointer transition-colors hover:bg-secondary/60", !n.isRead && "gold-ring")}
                  onClick={() => { if (!n.isRead) markRead.mutate(n.id); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-foreground">{n.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground/60">
                    {fmtDateTime(n.createdAt)}
                  </p>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}
