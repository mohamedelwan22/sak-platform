import type { Request, Response } from "express";
import { sendSuccess } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { AppError } from "../../../lib/errors.js";
import { SupportService } from "../services/support.service.js";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES } from "../constants/index.js";

const supportService = new SupportService();

/**
 * Staff endpoints. Route-level middleware enforces admin/super_admin; this
 * controller performs ticket-domain checks on top.
 */
export class SupportAdminController {
  /** POST /support/admin/tickets/:id/reply (multipart message + files). */
  async replyToTicket(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string; role?: string };
    const { message } = req.body as Record<string, string | undefined>;
    const result = await supportService.replyToTicket(
      {
        senderId: user.userId,
        senderRole: user.role ?? "admin",
        ticketId: String(req.params.id),
        message: String(message ?? ""),
        files: (req.files as Express.Multer.File[] | undefined) ?? [],
      },
      req,
    );
    sendSuccess(
      res,
      { message_id: result.message.id, status: result.ticket.status },
      "Reply sent",
      HttpStatus.CREATED,
    );
  }

  /** PATCH /support/admin/tickets/:id — status/priority transitions. */
  async updateTicket(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string; role?: string };
    const { status, priority } = req.body as Record<string, string | undefined>;
    const ticketId = String(req.params.id);

    let updated = null as Awaited<ReturnType<SupportService["changeStatus"]>> | null;
    if (status) {
      updated = await supportService.changeStatus(
        ticketId,
        { userId: user.userId, role: user.role ?? "admin" },
        status as never,
        req,
      );
    }
    if (priority) {
      if (!(SUPPORT_PRIORITIES as readonly string[]).includes(priority)) {
        throw new AppError("Invalid priority", 422, true, "VALIDATION_ERROR");
      }
      updated = await supportService.changePriority(
        ticketId,
        priority as (typeof SUPPORT_PRIORITIES)[number],
        req,
      );
    }
    if (!updated) {
      throw new AppError("Nothing to update — provide status and/or priority", 422, true, "VALIDATION_ERROR");
    }
    sendSuccess(
      res,
      { id: updated.id, status: updated.status, priority: updated.priority },
      "Ticket updated",
    );
  }

  /** POST /support/admin/tickets/:id/assign { assigneeId }. */
  async assignTicket(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string; role?: string };
    const { assigneeId } = req.body as Record<string, string | undefined>;
    if (!assigneeId || typeof assigneeId !== "string") {
      throw new AppError("assigneeId is required", 422, true, "VALIDATION_ERROR");
    }
    const updated = await supportService.assignTicket(
      String(req.params.id),
      assigneeId,
      { userId: user.userId, role: user.role ?? "admin" },
      req,
    );
    sendSuccess(
      res,
      { id: updated.id, status: updated.status, assigned_to: updated.assignedToId },
      "Ticket assigned",
    );
  }

  /** GET /support/admin/assignees — admin/support users for the assign picker. */
  async listAssignees(_req: Request, res: Response): Promise<void> {
    const { prisma } = await import("../../../lib/prisma.js");
    const users = await prisma.user.findMany({
      where: {
        role: { name: { in: ["admin", "super_admin", "support"] } },
        status: "active",
        deletedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: { select: { name: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
    });
    sendSuccess(
      res,
      users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        role: u.role.name,
      })),
      "Assignees retrieved",
    );
  }

  /** GET /support/admin/meta — filter options (single source of truth). */
  async getMeta(_req: Request, res: Response): Promise<void> {
    sendSuccess(
      res,
      {
        categories: SUPPORT_CATEGORIES,
        priorities: SUPPORT_PRIORITIES,
      },
      "Support meta retrieved",
    );
  }
}
