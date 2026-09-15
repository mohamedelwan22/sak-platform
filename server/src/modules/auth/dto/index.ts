import type { AuthUserSummary } from "../types/index.js";

export type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  ChangePasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  GoogleAuthInput,
} from "../validators/index.js";

export interface AuthResponseDTO {
  user: AuthUserSummary;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface VerificationRequiredResponseDTO {
  requiresVerification: true;
  user: {
    userId: string;
    email: string;
    role: string;
    accountNumber: string;
    emailVerified: boolean;
  };
}

export type RegisterResponseDTO = AuthResponseDTO | VerificationRequiredResponseDTO;

export interface UserResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accountNumber: string;
  emailVerified: boolean;
}
