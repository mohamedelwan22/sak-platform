import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tokenStorage } from "@/lib/tokenStorage";
import { PortalShell } from "@/components/PortalShell";
import { AuthLoading } from "@/components/auth/AuthLoading";
import { t } from "@/i18n";

export const Route = createFileRoute("/broker")({
  ssr: false,
  beforeLoad: async () => {
    if (!tokenStorage.hasTokens()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: BrokerLayout,
});

function BrokerLayout() {
  const { user, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();
  const hasBrokerContext = Boolean(user?.broker);

  useEffect(() => {
    if (isInitialized && !isLoading && user && !user.broker) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isInitialized, isLoading, user, navigate]);

  if (!isInitialized || isLoading || !user) {
    return (
      <PortalShell title={t("brokerRoute.k1")}>
        <AuthLoading />
      </PortalShell>
    );
  }

  // Non-broker accounts are redirected to the investor experience by the effect above.
  if (!hasBrokerContext) {
    return (
      <PortalShell title={t("brokerRoute.k2")}>
        <AuthLoading />
      </PortalShell>
    );
  }

  return <Outlet />;
}
