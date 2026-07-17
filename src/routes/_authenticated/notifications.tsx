import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/PortalShell";
import { EmptyState, Spinner } from "@/components/shared/ui-kit";
import { useSession } from "@/hooks/useAuth";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

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
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const hasUnread = (notifications ?? []).some((n) => !n.is_read);

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
        ) : !notifications?.length ? (
          <EmptyState
            icon={Bell}
            title="لا إشعارات"
            description="ستصلك هنا تحديثات حسابك واستثماراتك"
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className={cn("card-luxe p-5", !n.is_read && "gold-ring")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-foreground">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground/60">{fmtDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalShell>
  );
}
