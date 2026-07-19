import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { AuthService } from "../services/auth.service.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { parseDeviceInfo, hashRefreshToken } from "../utils/index.js";
import { generateCsrfToken } from "../../../middlewares/index.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import type { AuthenticatedUser } from "../types/index.js";

const authRepository = new AuthRepository();
const authService = new AuthService(authRepository);

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body, req);
    const csrfToken = generateCsrfToken(res);

    auditService.logFromRequest(req, {
      action: AuditActions.AUTH_REGISTER,
      entityType: "user",
      entityId: result.user.userId,
      success: true,
      details: { email: req.body.email },
    });

    sendSuccess(res, { ...result, csrfToken }, "Account created successfully", HttpStatus.CREATED);
  }

  async login(req: Request, res: Response): Promise<void> {
    const deviceInfo = parseDeviceInfo(req);
    let result;
    try {
      result = await authService.login(req.body, deviceInfo);
    } catch (error) {
      auditService.logFromRequest(req, {
        action: AuditActions.AUTH_LOGIN_FAILED,
        entityType: "user",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Login failed",
        details: { email: req.body.email },
      });
      throw error;
    }

    const csrfToken = generateCsrfToken(res);

    auditService.logFromRequest(req, {
      action: AuditActions.AUTH_LOGIN,
      entityType: "user",
      entityId: result.user.userId,
      success: true,
      details: { email: req.body.email, role: result.user.role },
    });

    sendSuccess(res, { ...result, csrfToken }, "Login successful");
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    let result;
    try {
      result = await authService.refreshTokens(req.body.refreshToken, req);
    } catch (error) {
      const action =
        error instanceof Error && error.message.includes("revoked")
          ? AuditActions.AUTH_TOKEN_REUSE
          : AuditActions.AUTH_REFRESH_TOKEN;
      auditService.logFromRequest(req, {
        action,
        entityType: "session",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Token refresh failed",
      });
      throw error;
    }

    const csrfToken = generateCsrfToken(res);

    auditService.logFromRequest(req, {
      action: AuditActions.AUTH_REFRESH_TOKEN,
      entityType: "session",
      success: true,
    });

    sendSuccess(res, { ...result, csrfToken }, "Tokens refreshed successfully");
  }

  async logout(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser | undefined;
    await authService.logout(req.body.refreshToken, req);
    res.clearCookie("csrf_token", { path: "/" });

    auditService.logFromRequest(req, {
      action: AuditActions.AUTH_LOGOUT,
      entityType: "user",
      entityId: user?.userId,
      success: true,
    });

    sendSuccess(res, null, "Logged out successfully");
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const result = await authService.logoutAll(user.userId);
    res.clearCookie("csrf_token", { path: "/" });

    auditService.logFromRequest(req, {
      action: AuditActions.AUTH_LOGOUT_ALL,
      entityType: "user",
      entityId: user.userId,
      success: true,
      details: { deletedCount: result.deletedCount },
    });

    sendSuccess(res, result, "Logged out from all devices");
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const result = await authService.me(user.userId);
    sendSuccess(res, result, "User profile retrieved");
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const currentTokenHash = this.extractCurrentTokenHash(req);
    const sessions = await authService.getSessions(user.userId, currentTokenHash);
    sendSuccess(res, sessions, "Sessions retrieved");
  }

  async deleteSession(req: Request, res: Response): Promise<void> {
    const user = (req as unknown as Record<string, unknown>).user as AuthenticatedUser;
    const sessionId = req.params.sessionId as string;
    const currentTokenHash = this.extractCurrentTokenHash(req);
    await authService.deleteSession(user.userId, sessionId, currentTokenHash);

    auditService.logFromRequest(req, {
      action: AuditActions.SESSION_DELETED,
      entityType: "session",
      entityId: sessionId,
      success: true,
      details: { userId: user.userId },
    });

    sendSuccess(res, null, "Session deleted");
  }

  private extractCurrentTokenHash(req: Request): string | undefined {
    const raw = req.headers["x-current-refresh-token"];
    const token = Array.isArray(raw) ? raw[0] : raw;
    return token ? hashRefreshToken(token) : undefined;
  }
}
