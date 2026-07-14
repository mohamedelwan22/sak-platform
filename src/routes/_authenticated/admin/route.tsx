import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/PortalShell";
import { Spinner } from "@/components/shared/ui-kit";
import { useSession, useIsAdmin } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { session, loading } = useSession();
  const { data: isAdmin, isLoading } = useIsAdmin(session?.user.id);

  if (loading || isLoading)
    return (
      <PortalShell title="الإدارة">
        <Spinner />
      </PortalShell>
    );

  if (!isAdmin)
    return (
      <PortalShell title="الإدارة">
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
          غير مصرح لك بالوصول إلى لوحة الإدارة.
        </p>
      </PortalShell>
    );

  return <Outlet />;
}
