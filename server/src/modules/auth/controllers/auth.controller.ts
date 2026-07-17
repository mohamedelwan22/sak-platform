import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { AuthService } from "../services/auth.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { parseDeviceInfo } from "../utils/index.js";
import { generateCsrfToken } from "../../../middlewares/index.js";
import type { AuthenticatedUser } from "../types/index.js";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body, req);
    const csrfToken = generateCsrfToken(res);
    sendSuccess(res, { ...result, csrfToken }, "Account created successfully", HttpStatus.CREATED);
  }

  async login(req: Request, res: Response): Promise<void> {
    const deviceInfo = parseDeviceInfo(req);
    const result = await authService.login(req.body, deviceInfo);
    const csrfToken = generateCsrfToken(res);
    sendSuccess(res, { ...result, csrfToken }, "Login successful");
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const result = await authService.refreshTokens(req.body.refreshToken, req);
    const csrfToken = generateCsrfToken(res);
    sendSuccess(res, { ...result, csrfToken }, "Tokens refreshed successfully");
  }

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.body.refreshToken, req);
    res.clearCookie("csrf_token", { path: "/" });
    sendSuccess(res, null, "Logged out successfully");
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const result = await authService.logoutAll(user.userId);
    res.clearCookie("csrf_token", { path: "/" });
    sendSuccess(res, result, "Logged out from all devices");
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const result = await authService.me(user.userId);
    sendSuccess(res, result, "User profile retrieved");
  }
}
