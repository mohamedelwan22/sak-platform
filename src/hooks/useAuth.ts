import { useContext } from "react";
import { AuthContext } from "@/components/auth/AuthProvider";
import type { AuthContextType } from "@/types";
import { useProfile, useWallet, useIsAdmin } from "./useData";

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useSession() {
  const { user, isLoading, isInitialized } = useAuth();
  const session = user
    ? {
        user: {
          id: "id" in user ? (user as { id: string }).id : (user as { userId: string }).userId,
          email: user.email,
        },
      }
    : null;
  return { session, loading: !isInitialized || isLoading };
}

export { useProfile, useWallet, useIsAdmin };
