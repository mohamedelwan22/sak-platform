import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { PasswordResetService } from "../services/password-reset.service.js";
import { PasswordResetRepository } from "../repositories/password-reset.repository.js";
import { ConsoleEmailProvider } from "../../../services/email/index.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const repository = new PasswordResetRepository();
const emailProvider = new ConsoleEmailProvider();
const service = new PasswordResetService(repository, emailProvider);

export class PasswordResetController {
  async forgotPassword(req: Request, res: Response): Promise<void> {
    await service.requestReset(req.body.email);

    auditService.logFromRequest(req, {
      action: AuditActions.PASSWORD_FORGOT_REQUESTED,
      entityType: "user",
      success: true,
      details: { email: req.body.email },
    });

    sendSuccess(res, null, "If an account exists with this email, a reset link has been sent");
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    await service.resetPassword(req.body.token, req.body.password);

    auditService.logFromRequest(req, {
      action: AuditActions.PASSWORD_RESET_COMPLETED,
      entityType: "user",
      success: true,
    });

    sendSuccess(res, null, "Password reset successful. You can now log in with your new password.");
  }
}
