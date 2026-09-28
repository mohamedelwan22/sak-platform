import type { Prisma, SupportTicket } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { AppError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { LocalStorageService } from "../../../services/storage/local-storage.service.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { logger } from "../../../lib/logger.js";
import {
  createNotificationIfPreferred,
  findStaffUserIds,
} from "../../notifications/services/notification-preference.service.js";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_TRANSITIONS,
  OWNER_ALLOWED_TRANSITIONS,
  TICKET_ATTACHMENT_MIME,
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MAX_FILES,
  TICKET_STORAGE_BUCKET,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
} from "../constants/index.js";

export type DatabaseClient = Prisma.TransactionClient | typeof prisma;

const storageService = new LocalStorageService();

/** Multer file filter for ticket attachments. */
export function ticketAttachmentFilter(
  _req: unknown,
  file: { mimetype: string; size?: number },
  cb: (err: Error | null, accept?: boolean) => void,
): void {
  if (!TICKET_ATTACHMENT_MIME.has(file.mimetype)) {
    cb(new ValidationError("Attachment type not allowed. Use JPG, PNG, WEBP, GIF or PDF."));
    return;
  }
  cb(null, true);
}

export interface ListTicketsInput {
  scopeUserId?: string; // set for investors — own tickets only
  search?: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  category?: SupportCategory;
  assignedToId?: string;
  userId?: string;
  page: number;
  limit: number;
  sortBy?: "createdAt" | "updatedAt" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface CreateTicketInput {
  userId: string;
  category: string;
  subject: string;
  message: string;
  files?: Express.Multer.File[];
}

export interface ReplyInput {
  senderId: string;
  senderRole: string;
  ticketId: string;
  message: string;
  files?: Express.Multer.File[];
}

/** Bilingual notification wrapper (Phase 11) with ticket deep link. */
async function notifyTicket(
  tx: DatabaseClient,
  userId: string,
  content: { titleAr: string; titleEn: string; messageAr: string; messageEn: string },
  excludeUserId?: string,
): Promise<void> {
  if (userId === excludeUserId) return;
  await createNotificationIfPreferred(tx, {
    userId,
    title: content.titleAr,
    titleEn: content.titleEn,
    message: content.messageAr,
    messageEn: content.messageEn,
    type: "system",
    linkUrl: "/support",
  });
}

function assertCategory(value: string): asserts value is SupportCategory {
  if (!(SUPPORT_CATEGORIES as readonly string[]).includes(value)) {
    throw new ValidationError("Invalid ticket category", { category: "Invalid category" });
  }
}

function assertPriority(value: string): asserts value is SupportPriority {
  if (!(SUPPORT_PRIORITIES as readonly string[]).includes(value)) {
    throw new ValidationError("Invalid ticket priority", { priority: "Invalid priority" });
  }
}

function assertStatus(value: string): asserts value is SupportStatus {
  if (!(SUPPORT_STATUSES as readonly string[]).includes(value)) {
    throw new ValidationError("Invalid ticket status", { status: "Invalid status" });
  }
}

async function generateTicketNumber(tx: DatabaseClient): Promise<string> {
  const year = new Date().getFullYear();
  // Attempt a few times on the (unlikely) unique race.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const countThisYear = await tx.supportTicket.count({
      where: { createdAt: { gte: new Date(`${year}-01-01T00:00:00Z`) } },
    });
    const number = `TKT-${year}-${String(countThisYear + 1).padStart(6, "0")}`;
    const existing = await tx.supportTicket.findUnique({ where: { ticketNumber: number } });
    if (!existing) return number;
  }
  throw new AppError("Failed to allocate a ticket number", 500, false);
}

async function storeAttachments(
  tx: DatabaseClient,
  ticketId: string,
  messageId: string | null,
  uploaderId: string,
  files: Express.Multer.File[],
): Promise<number> {
  let stored = 0;
  for (const file of files) {
    if (file.size > TICKET_ATTACHMENT_MAX_BYTES) {
      throw new AppError(`Attachment "${file.originalname}" exceeds 15MB`, 422, true, "FILE_TOO_LARGE");
    }
    if (!TICKET_ATTACHMENT_MIME.has(file.mimetype)) {
      throw new AppError(`Attachment "${file.originalname}" type not allowed`, 422, true, "FILE_TYPE_NOT_ALLOWED");
    }
    const uploaded = await storageService.upload(file, TICKET_STORAGE_BUCKET);
    await tx.supportTicketAttachment.create({
      data: {
        ticketId,
        messageId,
        fileName: uploaded.filename,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimetype,
        sizeBytes: uploaded.size,
        storagePath: uploaded.path,
        uploadedById: uploaderId,
      },
    });
    stored += 1;
  }
  return stored;
}

export class SupportService {
  // ── listing ──────────────────────────────────────────────────────────────

  async listTickets(input: ListTicketsInput) {
    const page = Math.max(1, input.page);
    const limit = Math.min(50, Math.max(1, input.limit));
    const sortBy = input.sortBy ?? "updatedAt";
    const sortOrder = input.sortOrder === "asc" ? "asc" : "desc";

    const where: Prisma.SupportTicketWhereInput = {};
    if (input.scopeUserId) where.userId = input.scopeUserId;
    else if (input.userId) where.userId = input.userId;
    if (input.status) where.status = input.status;
    if (input.priority) where.priority = input.priority;
    if (input.category) where.category = input.category;
    if (input.assignedToId) where.assignedToId = input.assignedToId;
    if (input.search) {
      const q = input.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { user: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { messages: true, attachments: true } },
        },
      }),
    ]);

    return {
      data: tickets.map((t) => this.mapSummary(t)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── retrieval ─────────────────────────────────────────────────────────────

  async getTicket(ticketId: string, viewer: { userId: string; isStaff: boolean }) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true } },
            attachments: true,
          },
        },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new NotFoundError("Ticket not found");
    if (!viewer.isStaff && ticket.userId !== viewer.userId) {
      // Do not leak existence to other investors.
      throw new NotFoundError("Ticket not found");
    }
    return this.mapDetail(ticket);
  }

  async getAttachment(
    attachmentId: string,
    viewer: { userId: string; isStaff: boolean },
  ): Promise<{ filePath: string; mimeType: string; originalName: string }> {
    const attachment = await prisma.supportTicketAttachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: { select: { id: true, userId: true } } },
    });
    if (!attachment) throw new NotFoundError("Attachment not found");
    if (!viewer.isStaff && attachment.ticket.userId !== viewer.userId) {
      throw new NotFoundError("Attachment not found");
    }
    return {
      filePath: storageService.getFilePath(attachment.storagePath),
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
    };
  }

  async getTicketAudit(ticketId: string, viewer: { userId: string; isStaff: boolean }) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("Ticket not found");
    if (!viewer.isStaff && ticket.userId !== viewer.userId) {
      throw new NotFoundError("Ticket not found");
    }
    return auditService.getLogsByEntity("support_ticket", ticketId, {
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  }

  // ── creation ─────────────────────────────────────────────────────────────

  async createTicket(
    input: CreateTicketInput,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    assertCategory(input.category);
    const subject = input.subject?.trim();
    const message = input.message?.trim();
    if (!subject || subject.length < 3 || subject.length > 255) {
      throw new ValidationError("Subject must be 3-255 characters", { subject: "Invalid length" });
    }
    if (!message || message.length < 1 || message.length > 8000) {
      throw new ValidationError("Message is required (max 8000 characters)", { message: "Invalid length" });
    }
    if ((input.files?.length ?? 0) > TICKET_ATTACHMENT_MAX_FILES) {
      throw new AppError(`Max ${TICKET_ATTACHMENT_MAX_FILES} attachments per message`, 422, true, "TOO_MANY_FILES");
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const number = await generateTicketNumber(tx);
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber: number,
          userId: input.userId,
          category: input.category,
          subject,
          status: "open",
          priority: "medium",
          lastMessageAt: new Date(),
        },
      });
      const msg = await tx.supportMessage.create({
        data: {
          ticketId: created.id,
          senderId: input.userId,
          senderRole: "investor",
          body: message,
        },
      });
      if (input.files?.length) {
        await storeAttachments(tx, created.id, msg.id, input.userId, input.files);
      }
      return created;
    });

    await auditService.logFromRequest(auditReq, {
      action: AuditActions.TICKET_CREATED,
      entityType: "support_ticket",
      entityId: ticket.id,
      newValues: { ticketNumber: ticket.ticketNumber, category: ticket.category, subject: ticket.subject },
      success: true,
    });

    // Notifications: confirm to the owner, alert staff.
    await prisma.$transaction(async (tx) => {
      await notifyTicket(tx, input.userId, {
        titleAr: "تم إنشاء تذكرتك",
        titleEn: "Your ticket has been created",
        messageAr: `تم إنشاء التذكرة ${ticket.ticketNumber} بنجاح وسيصلك رد فريق الدعم قريباً.`,
        messageEn: `Ticket ${ticket.ticketNumber} has been created. Our support team will reply soon.`,
      });
      for (const staffId of await findStaffUserIds(tx)) {
        await notifyTicket(tx, staffId, {
          titleAr: "تذكرة دعم جديدة",
          titleEn: "New support ticket",
          messageAr: `تذكرة جديدة ${ticket.ticketNumber} — ${subject}`,
          messageEn: `New ticket ${ticket.ticketNumber} — ${subject}`,
        });
      }
    });

    return ticket;
  }

  // ── conversation ──────────────────────────────────────────────────────────

  async replyToTicket(
    input: ReplyInput,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    const message = input.message?.trim();
    if (!message || message.length < 1 || message.length > 8000) {
      throw new ValidationError("Message is required (max 8000 characters)", { message: "Invalid length" });
    }
    if ((input.files?.length ?? 0) > TICKET_ATTACHMENT_MAX_FILES) {
      throw new AppError(`Max ${TICKET_ATTACHMENT_MAX_FILES} attachments per message`, 422, true, "TOO_MANY_FILES");
    }

    const isStaff = input.senderRole === "admin" || input.senderRole === "super_admin";
    const ticket = await prisma.supportTicket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) throw new NotFoundError("Ticket not found");
    if (!isStaff && ticket.userId !== input.senderId) {
      throw new NotFoundError("Ticket not found");
    }
    if (ticket.status === "closed") {
      throw new AppError("Ticket is closed — replies are disabled", 409, true, "TICKET_CLOSED");
    }

    const result = await prisma.$transaction(async (tx) => {
      const msg = await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: input.senderId,
          senderRole: input.senderRole,
          body: message,
        },
      });
      if (input.files?.length) {
        const stored = await storeAttachments(tx, ticket.id, msg.id, input.senderId, input.files);
        await auditService.logFromRequest(auditReq, {
          action: AuditActions.TICKET_ATTACHMENT_ADDED,
          entityType: "support_ticket",
          entityId: ticket.id,
          details: { messageId: msg.id, attachments: stored },
          success: true,
        });
      }

      // Auto-advance the lifecycle on reply.
      const data: Prisma.SupportTicketUpdateInput = { lastMessageAt: msg.createdAt };
      if (isStaff && ticket.status === "open") {
        data.status = "in_progress";
      }
      if (!isStaff && ticket.status === "waiting_for_investor") {
        data.status = "in_progress";
      }
      const updated = await tx.supportTicket.update({ where: { id: ticket.id }, data });
      return { message: msg, ticket: updated };
    });

    // ── Post-commit side effects ────────────────────────────────────────────
    // The message is already durably committed at this point. Audit and
    // notification fan-out are best-effort: a failure here must NOT be reported
    // as a failed reply, because the client would reasonably assume the message
    // was lost and resend it. Each step is isolated so one cannot mask another.
    await this.runSideEffect("support.reply.audit", async () => {
      await auditService.logFromRequest(auditReq, {
        action: AuditActions.TICKET_REPLIED,
        entityType: "support_ticket",
        entityId: ticket.id,
        details: { messageId: result.message.id, byRole: input.senderRole },
        success: true,
      });
    });

    // Notifications: inform the other side. The staff fan-out is O(number of
    // staff) round-trips on one pooled connection, so it needs an explicit
    // timeout well above the Prisma interactive-transaction default of 5s.
    await this.runSideEffect("support.reply.notify", () =>
      prisma.$transaction(
        async (tx) => {
          if (isStaff) {
            await notifyTicket(tx, ticket.userId, {
              titleAr: "رد جديد على تذكرتك",
              titleEn: "New reply on your ticket",
              messageAr: `رد جديد من فريق الدعم على التذكرة ${ticket.ticketNumber}.`,
              messageEn: `New support team reply on ticket ${ticket.ticketNumber}.`,
            });
          } else {
            const targets = new Set<string>(await findStaffUserIds(tx));
            if (result.ticket.assignedToId) targets.add(result.ticket.assignedToId);
            for (const targetId of targets) {
              await notifyTicket(tx, targetId, {
                titleAr: "رسالة جديدة من مستثمر",
                titleEn: "New investor message",
                messageAr: `رسالة جديدة على التذكرة ${ticket.ticketNumber}.`,
                messageEn: `New message on ticket ${ticket.ticketNumber}.`,
              });
            }
          }
        },
        { timeout: 60_000, maxWait: 15_000 },
      ),
    );

    return result;
  }

  /**
   * Runs a post-commit side effect without letting its failure fail the request.
   * Failures are logged for operational follow-up and swallowed by design.
   */
  private async runSideEffect(label: string, effect: () => Promise<unknown>): Promise<void> {
    try {
      await effect();
    } catch (error) {
      logger.error("support post-commit side effect failed", { label, err: error });
    }
  }

  // ── status / priority ─────────────────────────────────────────────────────

  async changeStatus(
    ticketId: string,
    actor: { userId: string; role: string },
    nextStatus: SupportStatus,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    assertStatus(nextStatus);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("Ticket not found");

    const isStaff = actor.role === "admin" || actor.role === "super_admin";
    if (!isStaff && ticket.userId !== actor.userId) {
      throw new NotFoundError("Ticket not found");
    }

    const allowed = isStaff
      ? SUPPORT_STATUS_TRANSITIONS[(ticket.status as SupportStatus) ?? "open"]
      : OWNER_ALLOWED_TRANSITIONS[(ticket.status as SupportStatus) ?? "open"];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        `Cannot move ticket from ${ticket.status} to ${nextStatus}`,
        409,
        true,
        "INVALID_TRANSITION",
      );
    }

    const isReopen = (ticket.status === "resolved" || ticket.status === "closed") && nextStatus === "open";
    const data: Prisma.SupportTicketUpdateInput = { status: nextStatus };
    if (nextStatus === "resolved") data.resolvedAt = new Date();
    if (nextStatus === "closed") data.closedAt = new Date();
    if (isReopen) {
      data.resolvedAt = null;
      data.closedAt = null;
    }

    const updated = await prisma.supportTicket.update({ where: { id: ticketId }, data });

    let action: string = AuditActions.TICKET_STATUS_CHANGED;
    if (nextStatus === "resolved") action = AuditActions.TICKET_RESOLVED;
    else if (nextStatus === "closed") action = AuditActions.TICKET_CLOSED;
    else if (isReopen) action = AuditActions.TICKET_REOPENED;

    await auditService.logFromRequest(auditReq, {
      action,
      entityType: "support_ticket",
      entityId: ticketId,
      oldValues: { status: ticket.status },
      newValues: { status: nextStatus },
      success: true,
    });

    // Notify the owner about lifecycle changes made by staff.
    if (isStaff && ticket.userId !== actor.userId) {
      const labels: Record<string, { ar: string; en: string }> = {
        in_progress: { ar: "قيد المعالجة", en: "in progress" },
        waiting_for_investor: { ar: "بانتظار ردك", en: "waiting for your reply" },
        resolved: { ar: "تم الحل", en: "resolved" },
        closed: { ar: "مغلقة", en: "closed" },
      };
      const label = labels[nextStatus];
      if (label) {
        await prisma.$transaction(async (tx) => {
          await notifyTicket(tx, ticket.userId, {
            titleAr: "تحديث على تذكرتك",
            titleEn: "Ticket update",
            messageAr: `أصبحت حالة التذكرة ${ticket.ticketNumber}: ${label.ar}.`,
            messageEn: `Ticket ${ticket.ticketNumber} is now ${label.en}.`,
          });
        });
      }
    }

    return updated;
  }

  async changePriority(
    ticketId: string,
    priority: SupportPriority,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    assertPriority(priority);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("Ticket not found");
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { priority },
    });
    await auditService.logFromRequest(auditReq, {
      action: AuditActions.TICKET_PRIORITY_CHANGED,
      entityType: "support_ticket",
      entityId: ticketId,
      oldValues: { priority: ticket.priority },
      newValues: { priority },
      success: true,
    });
    return updated;
  }

  // ── assignment ───────────────────────────────────────────────────────────

  async assignTicket(
    ticketId: string,
    assigneeId: string,
    actor: { userId: string; role: string },
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundError("Ticket not found");

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      include: { role: { select: { name: true } } },
    });
    if (!assignee || assignee.deletedAt) throw new NotFoundError("Assignee not found");
    if (!["admin", "super_admin", "support"].includes(assignee.role.name)) {
      throw new AppError("Tickets can only be assigned to admin/support users", 400, true, "INVALID_ASSIGNEE");
    }

    const isReassign = ticket.assignedToId !== null && ticket.assignedToId !== assigneeId;
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedToId: assigneeId,
        assignedAt: new Date(),
        assignedById: actor.userId,
        ...(ticket.status === "open" ? { status: "in_progress" as const } : {}),
      },
    });

    await auditService.logFromRequest(auditReq, {
      action: isReassign ? AuditActions.TICKET_REASSIGNED : AuditActions.TICKET_ASSIGNED,
      entityType: "support_ticket",
      entityId: ticketId,
      oldValues: { assignedToId: ticket.assignedToId },
      newValues: { assignedToId: assigneeId },
      details: { assigneeEmail: assignee.email },
      success: true,
    });

    await prisma.$transaction(async (tx) => {
      await notifyTicket(tx, assigneeId, {
        titleAr: "تذكرة دعم مسندة إليك",
        titleEn: "Support ticket assigned to you",
        messageAr: `أُسندت إليك التذكرة ${ticket.ticketNumber} — ${ticket.subject}.`,
        messageEn: `Ticket ${ticket.ticketNumber} — ${ticket.subject} has been assigned to you.`,
      });
    });

    return updated;
  }

  // ── mappers ───────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSummary(t: any) {
    return {
      id: t.id,
      ticket_number: t.ticketNumber,
      category: t.category,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      assigned_to: t.assignedTo
        ? {
            id: t.assignedTo.id,
            name: `${t.assignedTo.firstName} ${t.assignedTo.lastName}`.trim(),
            email: t.assignedTo.email,
          }
        : null,
      user: t.user
        ? {
            id: t.user.id,
            name: `${t.user.firstName} ${t.user.lastName}`.trim(),
            email: t.user.email,
          }
        : null,
      message_count: t._count?.messages ?? 0,
      attachment_count: t._count?.attachments ?? 0,
      last_message_at: t.lastMessageAt,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDetail(t: any) {
    return {
      ...this.mapSummary(t),
      resolved_at: t.resolvedAt,
      closed_at: t.closedAt,
      assigned_by: t.assignedBy
        ? { id: t.assignedBy.id, name: `${t.assignedBy.firstName} ${t.assignedBy.lastName}`.trim() }
        : null,
      messages: (t.messages ?? []).map((m: any) => ({
        id: m.id,
        body: m.body,
        sender_role: m.senderRole,
        sender: m.sender
          ? {
              id: m.sender.id,
              name: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
              email: m.sender.email,
            }
          : null,
        attachments: (m.attachments ?? []).map((a: any) => ({
          id: a.id,
          file_name: a.originalName,
          mime_type: a.mimeType,
          size_bytes: a.sizeBytes,
          url: `/api/v1/support/tickets/${t.id}/attachments/${a.id}`,
          created_at: a.createdAt,
        })),
        created_at: m.createdAt,
        edited_at: m.editedAt,
      })),
    };
  }
}

export type { SupportTicket };
