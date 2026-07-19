import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/PortalShell";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <PortalShell title="الإدارة">
        <AuthLoading />
      </PortalShell>
    );
  }

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return (
      <PortalShell title="الإدارة">
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4 text-sm font-semibold text-destructive">
          غير مصرح لك بالوصول إلى لوحة الإدارة.
        </p>
      </PortalShell>
    );
  }

  return <Outlet />;
}
