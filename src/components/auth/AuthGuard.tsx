import { useAuth } from "@/hooks/useAuth";
import { AuthLoading } from "./AuthLoading";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return fallback ?? <AuthLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
