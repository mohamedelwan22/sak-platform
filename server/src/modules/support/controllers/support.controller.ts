import type { Request, Response } from "express";
import fs from "node:fs";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { SupportService } from "../services/support.service.js";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "../constants/index.js";

const supportService = new SupportService();

function viewer(req: Request): { userId: string; isStaff: boolean } {
  const user = req.user as { userId: string; role?: string } | undefined;
  const role = user?.role ?? "";
  return {
    userId: user?.userId ?? "",
    isStaff: role === "admin" || role === "super_admin",
  };
}

/** Express handlers wrap thrown AppErrors via the global error middleware. */
export class SupportController {
  /** GET /support/tickets — own tickets for investors, all for staff (filters). */
  async listTickets(req: Request, res: Response): Promise<void> {
    const v = viewer(req);
    const { search, status, priority, category, assignedTo, userId, page, limit, sortBy, sortOrder } =
      req.query as Record<string, string | undefined>;

    const result = await supportService.listTickets({
      scopeUserId: v.isStaff ? undefined : v.userId,
      userId: v.isStaff && userId ? userId : undefined,
      search,
      status: status && (SUPPORT_STATUSES as readonly string[]).includes(status)
        ? (status as (typeof SUPPORT_STATUSES)[number])
        : undefined,
      priority: priority && (SUPPORT_PRIORITIES as readonly string[]).includes(priority)
        ? (priority as (typeof SUPPORT_PRIORITIES)[number])
        : undefined,
      category: category && (SUPPORT_CATEGORIES as readonly string[]).includes(category)
        ? (category as (typeof SUPPORT_CATEGORIES)[number])
        : undefined,
      assignedToId: v.isStaff ? assignedTo : undefined,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      sortBy: sortBy === "createdAt" ? "createdAt" : sortBy === "priority" ? "priority" : "updatedAt",
      sortOrder: sortOrder === "asc" ? "asc" : "desc",
    });
    sendSuccess(res, result, "Tickets retrieved");
  }

  /** GET /support/tickets/:id — participant or staff only. */
  async getTicket(req: Request, res: Response): Promise<void> {
    const ticket = await supportService.getTicket(String(req.params.id), viewer(req));
    sendSuccess(res, ticket, "Ticket retrieved");
  }

  /** GET /support/tickets/:id/audit — ticket audit history. */
  async getTicketAudit(req: Request, res: Response): Promise<void> {
    const result = await supportService.getTicketAudit(String(req.params.id), viewer(req));
    sendSuccess(res, result, "Ticket audit history retrieved");
  }

  /** GET /support/tickets/:ticketId/attachments/:attachmentId — secure download. */
  async downloadAttachment(req: Request, res: Response): Promise<void> {
    const { filePath, mimeType, originalName } = await supportService.getAttachment(
      String(req.params.attachmentId),
      viewer(req),
    );
    if (!fs.existsSync(filePath)) {
      sendNotFound(res, "Attachment not found");
      return;
    }
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    );
    fs.createReadStream(filePath).pipe(res);
  }

  /** POST /support/tickets (multipart: category, subject, message, files). */
  async createTicket(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string };
    const { category, subject, message } = req.body as Record<string, string | undefined>;
    if (!category) {
      sendError(res, "Category is required", 422, "VALIDATION_ERROR");
      return;
    }
    const ticket = await supportService.createTicket(
      {
        userId: user.userId,
        category: String(category),
        subject: String(subject ?? ""),
        message: String(message ?? ""),
        files: (req.files as Express.Multer.File[] | undefined) ?? [],
      },
      req,
    );
    sendSuccess(
      res,
      { id: ticket.id, ticket_number: ticket.ticketNumber, status: ticket.status, priority: ticket.priority },
      "Ticket created",
      HttpStatus.CREATED,
    );
  }

  /** POST /support/tickets/:id/messages (multipart: message, files). */
  async replyToTicket(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string; role?: string };
    const { message } = req.body as Record<string, string | undefined>;
    const result = await supportService.replyToTicket(
      {
        senderId: user.userId,
        senderRole: user.role ?? "investor",
        ticketId: String(req.params.id),
        message: String(message ?? ""),
        files: (req.files as Express.Multer.File[] | undefined) ?? [],
      },
      req,
    );
    sendSuccess(
      res,
      {
        message_id: result.message.id,
        status: result.ticket.status,
        created_at: result.message.createdAt,
      },
      "Reply sent",
      HttpStatus.CREATED,
    );
  }

  /**
   * PATCH /support/tickets/:id/status — owner may close/reopen own ticket;
   * staff may apply any valid transition.
   */
  async changeStatus(req: Request, res: Response): Promise<void> {
    const user = req.user as { userId: string; role?: string };
    const { status } = req.body as Record<string, string | undefined>;
    if (!status) {
      sendError(res, "Status is required", 422, "VALIDATION_ERROR");
      return;
    }
    const updated = await supportService.changeStatus(
      String(req.params.id),
      { userId: user.userId, role: user.role ?? "investor" },
      status as never,
      req,
    );
    sendSuccess(res, { id: updated.id, status: updated.status }, "Ticket status updated");
  }
}
