import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { tokenStorage } from "@/lib/tokenStorage";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!tokenStorage.hasTokens()) {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
