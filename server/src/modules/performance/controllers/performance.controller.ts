import type { Request, Response } from "express";
import { sendError, sendSuccess } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { PerformanceService } from "../services/performance.service.js";
import { PerformanceRepository } from "../repositories/performance.repository.js";

const performanceRepository = new PerformanceRepository();
const performanceService = new PerformanceService(performanceRepository);

export class PerformanceController {
  async getReport(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId?: string } | undefined;
    if (!user?.userId) {
      sendError(res, "Authentication required", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
      return;
    }
    try {
      const report = await performanceService.getReport(user.userId);
      sendSuccess(res, report, "Performance report retrieved");
    } catch (error) {
      sendError(res, "Failed to retrieve performance report");
    }
  }
}
