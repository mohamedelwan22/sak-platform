import type { AuthenticatedUser } from "../types/index.js";

export type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
} from "../validators/index.js";

export interface AuthResponseDTO {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}
