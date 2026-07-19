import { useAuth } from "@/hooks/useAuth";
import { AuthLoading } from "./AuthLoading";

interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
