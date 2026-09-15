import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/api/profile.api";

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.me();
      return res.data.data;
    },
  });
}

export function useWallet(userId?: string) {
  return useQuery({
    queryKey: ["wallet", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.wallet();
      return res.data.data;
    },
  });
}

export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await profileApi.me();
      const rawRole = res.data.data?.role;
      const role = typeof rawRole === "string" ? rawRole : rawRole?.name;
      return role === "admin" || role === "super_admin";
    },
  });
}
