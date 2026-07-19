import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { tokenStorage } from "@/lib/tokenStorage";
import { queryKeys } from "@/lib/queryKeys";
import type { AuthContextType, AuthState, User, LoginCredentials, RegisterData } from "@/types";

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_CHECK_INTERVAL = 4 * 60 * 1000;

function parseJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getTokenExpiresAt(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
  });
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    const expiresAt = getTokenExpiresAt(accessToken);
    if (!expiresAt) return;
    const refreshIn = Math.max(expiresAt - Date.now() - 30_000, 5_000);
    refreshTimeoutRef.current = setTimeout(async () => {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) return;
      try {
        const { data: response } = await authApi.refresh(refreshToken);
        if (response.success && response.data) {
          tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
          scheduleRefresh(response.data.accessToken);
        }
      } catch {
        tokenStorage.clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    }, refreshIn);
  }, []);

  const loadUser = useCallback(async () => {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) {
      setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      return;
    }
    try {
      const { data: response } = await authApi.me();
      if (response.success && response.data) {
        setState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
        scheduleRefresh(accessToken);
      } else {
        tokenStorage.clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    } catch {
      tokenStorage.clearTokens();
      setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    loadUser();
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [loadUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = tokenStorage.getAccessToken();
      if (!token) return;
      const expiresAt = getTokenExpiresAt(token);
      if (expiresAt && expiresAt < Date.now()) {
        tokenStorage.clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
        window.location.href = "/auth";
      }
    }, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { data: response } = await authApi.login(credentials);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Login failed");
      }
      tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
      setState({
        user: {
          id: response.data.user.userId,
          email: response.data.user.email,
          firstName: "",
          lastName: "",
          role: response.data.user.role,
          status: "active",
        },
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
      scheduleRefresh(response.data.accessToken);
      const meResponse = await authApi.me();
      if (meResponse.data.success && meResponse.data.data) {
        setState((prev) => ({ ...prev, user: meResponse.data.data! }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
    [queryClient, scheduleRefresh],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const { data: response } = await authApi.register(data);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || "Registration failed");
      }
      tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
      setState({
        user: {
          id: response.data.user.userId,
          email: response.data.user.email,
          firstName: "",
          lastName: "",
          role: response.data.user.role,
          status: "active",
        },
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
      scheduleRefresh(response.data.accessToken);
      const meResponse = await authApi.me();
      if (meResponse.data.success && meResponse.data.data) {
        setState((prev) => ({ ...prev, user: meResponse.data.data! }));
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
    },
    [queryClient, scheduleRefresh],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // proceed with local cleanup even if API call fails
    }
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    tokenStorage.clearTokens();
    await queryClient.cancelQueries();
    queryClient.clear();
    setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
  }, [queryClient]);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } catch {
      // proceed with local cleanup
    }
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    tokenStorage.clearTokens();
    await queryClient.cancelQueries();
    queryClient.clear();
    setState({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
  }, [queryClient]);

  const refresh = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");
    const { data: response } = await authApi.refresh(refreshToken);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || "Refresh failed");
    }
    tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    scheduleRefresh(response.data.accessToken);
  }, [scheduleRefresh]);

  const forgotPassword = useCallback(async (email: string) => {
    const { data: response } = await authApi.forgotPassword(email);
    if (!response.success) {
      throw new Error(response.error?.message || "Request failed");
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const { data: response } = await authApi.resetPassword(token, password);
    if (!response.success) {
      throw new Error(response.error?.message || "Reset failed");
    }
  }, []);

  const hasPermission = useCallback(
    (_permission: string) => {
      if (!state.user) return false;
      if (state.user.role === "super_admin") return true;
      return false;
    },
    [state.user],
  );

  const hasRole = useCallback(
    (roles: string | string[]) => {
      if (!state.user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(state.user.role);
    },
    [state.user],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      logoutAll,
      refresh,
      forgotPassword,
      resetPassword,
      hasPermission,
      hasRole,
    }),
    [
      state,
      login,
      register,
      logout,
      logoutAll,
      refresh,
      forgotPassword,
      resetPassword,
      hasPermission,
      hasRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
