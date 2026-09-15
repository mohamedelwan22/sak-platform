import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { sendSuccess, sendNotFound, sendError } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";

const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

export class SupportController {
  async findAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
      const { status, category, page, limit } = req.query;
      const qPage = Math.max(1, Number(page) || 1);
      const qLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const where: Prisma.SupportTicketWhereInput = {
        ...(isStaff ? {} : { userId }),
      };
      if (status && VALID_STATUSES.includes(status as string)) where.status = status as string;
      if (category && typeof category === "string") where.category = category;

      const [total, tickets] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (qPage - 1) * qLimit,
          take: qLimit,
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { messages: true } },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / qLimit);
      sendSuccess(
        res,
        {
          data: tickets.map((t) => ({
            id: t.id,
            category: t.category,
            subject: t.subject,
            status: t.status,
            priority: t.priority,
            message_count: t._count.messages,
            user: t.user
              ? {
                  id: t.user.id,
                  first_name: t.user.firstName,
                  last_name: t.user.lastName,
                  email: t.user.email,
                }
              : null,
            created_at: t.createdAt,
            updated_at: t.updatedAt,
          })),
          total,
          page: qPage,
          limit: qLimit,
          totalPages,
          hasNextPage: qPage < totalPages,
          hasPreviousPage: qPage > 1,
        },
        "Support tickets retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve support tickets");
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const id = String(req.params.id);
      const ticket = await prisma.supportTicket.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });
      if (!ticket) {
        sendNotFound(res, "Support ticket not found");
        return;
      }
      const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
      if (!isStaff && ticket.userId !== userId) {
        sendNotFound(res, "Support ticket not found");
        return;
      }
      sendSuccess(
        res,
        {
          id: ticket.id,
          category: ticket.category,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          user: ticket.user
            ? {
                id: ticket.user.id,
                first_name: ticket.user.firstName,
                last_name: ticket.user.lastName,
                email: ticket.user.email,
              }
            : null,
          messages: ticket.messages.map((m) => ({
            id: m.id,
            body: m.body,
            sender: m.sender
              ? {
                  id: m.sender.id,
                  first_name: m.sender.firstName,
                  last_name: m.sender.lastName,
                  email: m.sender.email,
                }
              : null,
            created_at: m.createdAt,
          })),
          created_at: ticket.createdAt,
          updated_at: ticket.updatedAt,
        },
        "Support ticket retrieved",
      );
    } catch {
      sendError(res, "Failed to retrieve support ticket");
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendNotFound(res, "User not found");
        return;
      }
      const { subject, category, body } = req.body;
      if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
        sendError(res, "Subject is required (min 3 characters)", 400, "VALIDATION_ERROR");
        return;
      }
      if (!body || typeof body !== "string" || body.trim().length < 1) {
        sendError(res, "Message body is required", 400, "VALIDATION_ERROR");
        return;
      }

      const ticket = await prisma.$transaction(async (tx) => {
        const created = await tx.supportTicket.create({
          data: {
            userId,
            subject: subject.trim(),
            category: category && typeof category === "string" ? category.trim() : "general",
            status: "open",
            priority: "normal",
          },
        });
        await tx.supportMessage.create({
          data: { ticketId: created.id, senderId: userId, body: String(body).trim() },
        });
        return created;
      });

      sendSuccess(res, { id: ticket.id }, "Support ticket created", HttpStatus.CREATED);
    } catch {
      sendError(res, "Failed to create support ticket");
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const id = String(req.params.id);
      const existing = await prisma.supportTicket.findUnique({ where: { id } });
      if (!existing) {
        sendNotFound(res, "Support ticket not found");
        return;
      }
      const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
      if (!isStaff && existing.userId !== userId) {
        sendNotFound(res, "Support ticket not found");
        return;
      }

      const { body, status, priority } = req.body;
      const data: Prisma.SupportTicketUpdateInput = {};

      if (status) {
        if (!isStaff) {
          if (status !== "closed") {
            sendError(res, "Only staff may set ticket status", 403, "FORBIDDEN");
            return;
          }
        } else if (!VALID_STATUSES.includes(status as string)) {
          sendError(res, "Invalid status", 400, "VALIDATION_ERROR");
          return;
        }
        data.status = status as string;
        if (status === "resolved") data.resolvedAt = new Date();
        if (status === "closed") data.closedAt = new Date();
      }

      if (priority) {
        if (!isStaff) {
          sendError(res, "Only staff may set priority", 403, "FORBIDDEN");
          return;
        }
        if (!VALID_PRIORITIES.includes(priority as string)) {
          sendError(res, "Invalid priority", 400, "VALIDATION_ERROR");
          return;
        }
        data.priority = priority as string;
      }

      const updated = await prisma.$transaction(async (tx) => {
        let messageId: string | null = null;
        if (body && typeof body === "string" && body.trim().length > 0) {
          const message = await tx.supportMessage.create({
            data: { ticketId: id, senderId: userId!, body: body.trim() },
          });
          messageId = message.id;
        }
        const result = await tx.supportTicket.update({ where: { id }, data });
        return { result, messageId };
      });

      sendSuccess(
        res,
        {
          id: updated.result.id,
          status: updated.result.status,
          priority: updated.result.priority,
          message_id: updated.messageId,
        },
        "Support ticket updated",
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        sendError(res, "Failed to update support ticket", 400, "VALIDATION_ERROR");
        return;
      }
      sendError(res, "Failed to update support ticket");
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
      if (!isStaff) {
        sendError(res, "Only staff may delete support tickets", 403, "FORBIDDEN");
        return;
      }
      const existing = await prisma.supportTicket.findUnique({ where: { id } });
      if (!existing) {
        sendNotFound(res, "Support ticket not found");
        return;
      }
      await prisma.supportMessage.deleteMany({ where: { ticketId: id } });
      await prisma.supportTicket.delete({ where: { id } });
      sendSuccess(res, null, "Support ticket deleted");
    } catch {
      sendError(res, "Failed to delete support ticket");
    }
  }
}
