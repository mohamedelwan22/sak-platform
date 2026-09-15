export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  csrfToken?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  accountNumber?: string;
  emailVerified?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accountNumber?: string;
  emailVerified?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface VerifyEmailData {
  email: string;
  code: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface ResendVerificationData {
  email: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  csrfToken?: string;
}

export interface VerificationRequiredResponse {
  requiresVerification: true;
  user: {
    userId: string;
    email: string;
    role: string;
    accountNumber: string;
    emailVerified: boolean;
  };
  csrfToken?: string;
}

export type RegisterResponse = AuthSessionResponse | VerificationRequiredResponse;

export type AuthOutcome = "authenticated" | "verification_required";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  pendingEmail: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthOutcome>;
  register: (data: RegisterData) => Promise<AuthOutcome>;
  googleSignIn: (credential: string) => Promise<AuthOutcome>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}
