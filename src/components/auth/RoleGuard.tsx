import { useAuth } from "@/hooks/useAuth";
import { AuthLoading } from "./AuthLoading";

interface RoleGuardProps {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { hasRole, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return <AuthLoading />;
  }

  if (!hasRole(roles)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}
