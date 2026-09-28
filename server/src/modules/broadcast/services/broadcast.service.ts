import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { AppError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";
import { getSegment, listSegments } from "../segments.js";
import { createNotificationIfPreferred } from "../../notifications/services/notification-preference.service.js";

export type DatabaseClient = Prisma.TransactionClient | typeof prisma;

/** Only http(s) URLs are accepted for links and media. */
export function assertSafeHttpUrl(value: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError(`Invalid ${field} URL`, { [field]: "Invalid URL" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    // Rejects javascript:, data:, vbscript:, file:, and every other scheme.
    throw new ValidationError(`Only http(s) URLs are allowed for ${field}`, {
      [field]: "Unsafe scheme",
    });
  }
  return parsed.toString();
}

export interface CreateBroadcastInput {
  createdById: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  ctaLabelEn?: string | null;
  ctaLabelAr?: string | null;
  externalUrl?: string | null;
  imageUrl?: string | null;
  audienceType: "ALL_INVESTORS" | "ALL_BROKERS" | "SPECIFIC_USERS" | "SEGMENT";
  targetUserIds?: string[] | null;
  segmentKey?: string | null;
  showInTicker: boolean;
  /** Phase F: eligible for the public-website ticker (above the navbar). */
  isPublic?: boolean;
}

export class BroadcastService {
  // ── audience resolution ──────────────────────────────────────────────────

  async resolveAudience(broadcast: {
    audienceType: string;
    targetUserIds: unknown;
    segmentKey: string | null;
  }): Promise<string[]> {
    switch (broadcast.audienceType) {
      case "ALL_INVESTORS": {
        const rows = await prisma.user.findMany({
          where: {
            role: { name: "investor" },
            deletedAt: null,
            status: { in: ["active", "pending"] },
          },
          select: { id: true },
        });
        return rows.map((r) => r.id);
      }
      case "ALL_BROKERS": {
        const rows = await prisma.brokerProfile.findMany({
          where: { isActive: true, user: { deletedAt: null } },
          select: { userId: true },
        });
        return rows.map((r) => r.userId);
      }
      case "SPECIFIC_USERS": {
        const ids = Array.isArray(broadcast.targetUserIds)
          ? (broadcast.targetUserIds as string[]).filter(
              (id) => typeof id === "string" && /^[0-9a-fA-F-]{36}$/.test(id),
            )
          : [];
        if (ids.length === 0) {
          throw new ValidationError("SPECIFIC_USERS audience requires a non-empty user list", {
            targetUserIds: "Empty audience",
          });
        }
        const found = await prisma.user.findMany({
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true },
        });
        return found.map((r) => r.id);
      }
      case "SEGMENT": {
        const segment = getSegment(broadcast.segmentKey ?? "");
        if (!segment) {
          throw new ValidationError("Unknown segment", { segmentKey: "Unknown segment" });
        }
        return segment.resolve(prisma);
      }
      default:
        throw new ValidationError("Invalid audience type", { audienceType: "Invalid" });
    }
  }

  async previewAudience(input: {
    audienceType: CreateBroadcastInput["audienceType"];
    targetUserIds?: string[] | null;
    segmentKey?: string | null;
  }): Promise<{ count: number; sample: Array<{ id: string; email: string }> }> {
    const ids = await this.resolveAudience({
      audienceType: input.audienceType,
      targetUserIds: input.targetUserIds ?? null,
      segmentKey: input.segmentKey ?? null,
    });
    const sample = await prisma.user.findMany({
      where: { id: { in: ids.slice(0, 200) } },
      select: { id: true, email: true },
      take: 10,
    });
    return { count: ids.length, sample };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  getSegments() {
    return listSegments();
  }

  async create(
    input: CreateBroadcastInput,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    this.assertContent(input);
    const externalUrl = input.externalUrl
      ? assertSafeHttpUrl(input.externalUrl, "externalUrl")
      : null;
    const imageUrl = input.imageUrl ? assertSafeHttpUrl(input.imageUrl, "imageUrl") : null;

    if (input.audienceType === "SEGMENT" && !getSegment(input.segmentKey ?? "")) {
      throw new ValidationError("Unknown segment", { segmentKey: "Unknown segment" });
    }
    if (
      input.audienceType === "SPECIFIC_USERS" &&
      (!input.targetUserIds || input.targetUserIds.length === 0)
    ) {
      throw new ValidationError("SPECIFIC_USERS audience requires a user list", {
        targetUserIds: "Empty",
      });
    }

    const audienceCount = await this.resolveAudience({
      audienceType: input.audienceType,
      targetUserIds: input.targetUserIds ?? null,
      segmentKey: input.segmentKey ?? null,
    }).then((ids) => ids.length);

    const broadcast = await prisma.broadcast.create({
      data: {
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        messageEn: input.messageEn,
        messageAr: input.messageAr,
        ctaLabelEn: input.ctaLabelEn ?? null,
        ctaLabelAr: input.ctaLabelAr ?? null,
        externalUrl,
        imageUrl,
        audienceType: input.audienceType,
        targetUserIds: (input.targetUserIds ?? undefined) as Prisma.InputJsonValue | undefined,
        segmentKey: input.segmentKey ?? null,
        status: "draft",
        showInTicker: input.showInTicker,
        isPublic: input.isPublic ?? false,
        createdById: input.createdById,
      },
    });

    await auditService.logFromRequest(auditReq, {
      action: AuditActions.BROADCAST_CREATED,
      entityType: "broadcast",
      entityId: broadcast.id,
      newValues: {
        titleEn: broadcast.titleEn,
        audienceType: broadcast.audienceType,
        audienceCount,
      },
      success: true,
    });
    await auditService.logFromRequest(auditReq, {
      action: AuditActions.BROADCAST_AUDIENCE_SELECTED,
      entityType: "broadcast",
      entityId: broadcast.id,
      details: { audienceType: broadcast.audienceType, count: audienceCount },
      success: true,
    });

    return broadcast;
  }

  async update(
    id: string,
    input: Partial<CreateBroadcastInput>,
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundError("Announcement not found");
    if (broadcast.status !== "draft") {
      throw new AppError("Only draft announcements can be edited", 409, true, "NOT_EDITABLE");
    }

    const data: Prisma.BroadcastUpdateInput = {};
    if (input.titleEn !== undefined) data.titleEn = input.titleEn;
    if (input.titleAr !== undefined) data.titleAr = input.titleAr;
    if (input.messageEn !== undefined) data.messageEn = input.messageEn;
    if (input.messageAr !== undefined) data.messageAr = input.messageAr;
    if (input.ctaLabelEn !== undefined) data.ctaLabelEn = input.ctaLabelEn ?? null;
    if (input.ctaLabelAr !== undefined) data.ctaLabelAr = input.ctaLabelAr ?? null;
    if (input.externalUrl !== undefined) {
      data.externalUrl = input.externalUrl
        ? assertSafeHttpUrl(input.externalUrl, "externalUrl")
        : null;
    }
    if (input.imageUrl !== undefined) {
      data.imageUrl = input.imageUrl ? assertSafeHttpUrl(input.imageUrl, "imageUrl") : null;
    }
    if (input.showInTicker !== undefined) data.showInTicker = input.showInTicker;
    if (input.isPublic !== undefined) data.isPublic = input.isPublic;
    if (input.audienceType !== undefined) {
      data.audienceType = input.audienceType;
      if (input.audienceType === "SPECIFIC_USERS") {
        data.targetUserIds = (input.targetUserIds ?? undefined) as
          Prisma.InputJsonValue | undefined;
      }
      if (input.audienceType === "SEGMENT") data.segmentKey = input.segmentKey ?? null;
    }

    const updated = await prisma.broadcast.update({ where: { id }, data });
    await auditService.logFromRequest(auditReq, {
      action: AuditActions.BROADCAST_UPDATED,
      entityType: "broadcast",
      entityId: id,
      newValues: { titleEn: updated.titleEn, audienceType: updated.audienceType },
      success: true,
    });
    return updated;
  }

  async list(page: number, limit: number) {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(50, Math.max(1, limit));
    const [total, rows] = await Promise.all([
      prisma.broadcast.count(),
      prisma.broadcast.findMany({
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          createdBy: { select: { firstName: true, lastName: true, email: true } },
          sentBy: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { recipients: true } },
        },
      }),
    ]);
    return {
      data: rows.map((b) => this.mapSummary(b)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getById(id: string) {
    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        sentBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!broadcast) throw new NotFoundError("Announcement not found");

    const delivery = await prisma.broadcastRecipient.groupBy({
      by: ["deliveryStatus"],
      where: { broadcastId: id },
      _count: { _all: true },
    });

    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    return {
      ...this.mapSummary(broadcast),
      delivery: delivery.map((d) => ({ status: d.deliveryStatus, count: d._count._all })),
      recipients: recipients.map((r) => ({
        id: r.id,
        user_email: r.user.email,
        user_name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        delivery_status: r.deliveryStatus,
        read_at: r.readAt,
        created_at: r.createdAt,
      })),
    };
  }

  // ── send (idempotent) ────────────────────────────────────────────────────

  async send(
    id: string,
    actor: { userId: string },
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundError("Announcement not found");

    // Idempotency: only draft/scheduled announcements can be sent.
    if (broadcast.status === "sent") {
      throw new AppError("This announcement has already been sent", 409, true, "DUPLICATE_SEND");
    }
    if (broadcast.status === "sending") {
      throw new AppError("This announcement is currently being sent", 409, true, "DUPLICATE_SEND");
    }
    if (broadcast.status === "cancelled") {
      throw new AppError("Cancelled announcements cannot be sent", 409, true, "NOT_SENDABLE");
    }

    await prisma.broadcast.update({ where: { id }, data: { status: "sending" } });

    let audience: string[] = [];
    try {
      audience = await this.resolveAudience(broadcast);
    } catch (err) {
      await prisma.broadcast.update({
        where: { id },
        data: { status: "failed", sentById: actor.userId },
      });
      await auditService.logFromRequest(auditReq, {
        action: AuditActions.BROADCAST_SEND_FAILED,
        entityType: "broadcast",
        entityId: id,
        errorMessage: err instanceof Error ? err.message : "Audience resolution failed",
        success: false,
      });
      throw err;
    }

    if (audience.length === 0) {
      await prisma.broadcast.update({
        where: { id },
        data: { status: "failed", sentById: actor.userId, failureCount: 1 },
      });
      await auditService.logFromRequest(auditReq, {
        action: AuditActions.BROADCAST_SEND_FAILED,
        entityType: "broadcast",
        entityId: id,
        errorMessage: "Audience resolved to zero recipients",
        success: false,
      });
      throw new AppError("The selected audience is empty", 400, true, "EMPTY_AUDIENCE");
    }

    let sent = 0;
    let failed = 0;

    await prisma.$transaction(
      async (tx) => {
      for (const userId of audience) {
        try {
          const recipient = await tx.broadcastRecipient.upsert({
            where: { broadcastId_userId: { broadcastId: id, userId } },
            create: { broadcastId: id, userId, deliveryStatus: "created" },
            update: {},
          });

          const notification = await createNotificationIfPreferred(tx, {
            userId,
            title: broadcast.titleAr,
            titleEn: broadcast.titleEn,
            message: broadcast.messageAr,
            messageEn: broadcast.messageEn,
            type: "broadcast",
            linkUrl: broadcast.externalUrl ?? undefined,
          });

          await tx.broadcastRecipient.update({
            where: { id: recipient.id },
            data: {
              notificationId: notification?.id ?? null,
              deliveryStatus: notification ? "sent" : "failed",
              failedReason: notification ? null : "Notification preferences disabled this type",
            },
          });
          sent += 1;
        } catch (err) {
          failed += 1;
          await tx.broadcastRecipient.upsert({
            where: { broadcastId_userId: { broadcastId: id, userId } },
            create: {
              broadcastId: id,
              userId,
              deliveryStatus: "failed",
              failedReason: err instanceof Error ? err.message : "Delivery failed",
            },
            update: {
              deliveryStatus: "failed",
              failedReason: err instanceof Error ? err.message : "Delivery failed",
            },
          });
        }
      }

      await tx.broadcast.update({
        where: { id },
        data: {
          status: "sent",
          sentAt: new Date(),
          sentById: actor.userId,
          recipientCount: sent,
          failureCount: failed,
        },
      });
      },
      // Large audiences (per-recipient notification inserts) can exceed the
      // default 5s interactive-transaction budget.
      { timeout: 60_000 },
    );

    await auditService.logFromRequest(auditReq, {
      action: AuditActions.BROADCAST_SENT,
      entityType: "broadcast",
      entityId: id,
      details: { recipients: sent, failed, audienceType: broadcast.audienceType },
      success: true,
    });

    return { recipientCount: sent, failureCount: failed };
  }

  async cancel(
    id: string,
    _actor: { userId: string },
    auditReq: Parameters<typeof auditService.logFromRequest>[0],
  ) {
    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundError("Announcement not found");
    if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
      throw new AppError(
        "Only draft/scheduled announcements can be cancelled",
        409,
        true,
        "NOT_CANCELLABLE",
      );
    }
    const updated = await prisma.broadcast.update({
      where: { id },
      data: { status: "cancelled" },
    });
    await auditService.logFromRequest(auditReq, {
      action: AuditActions.BROADCAST_CANCELLED,
      entityType: "broadcast",
      entityId: id,
      oldValues: { status: broadcast.status },
      newValues: { status: "cancelled" },
      success: true,
    });
    return updated;
  }

  /** Deactivate/reactivate the ticker surface without touching delivery. */
  async setTickerActive(id: string, active: boolean) {
    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundError("Announcement not found");
    return prisma.broadcast.update({ where: { id }, data: { tickerActive: active } });
  }

  /**
   * Recovers broadcasts stranded in `sending` by a crashed or interrupted run.
   *
   * `send()` claims the row with a plain read-then-write, so a process that dies
   * mid-fan-out leaves the status at `sending` forever, after which every retry
   * is rejected with 409 DUPLICATE_SEND. This marks those rows `failed` so an
   * operator can retry from the UI instead of editing the database by hand.
   * The `status: "sending"` predicate makes it a safe compare-and-swap.
   */
  async reconcileStuckSends(staleAfterMs = 10 * 60_000) {
    const cutoff = new Date(Date.now() - staleAfterMs);
    const stuck = await prisma.broadcast.findMany({
      where: { status: "sending", updatedAt: { lt: cutoff } },
      select: { id: true, titleEn: true },
    });
    if (stuck.length === 0) return { recovered: 0, ids: [] as string[] };

    const result = await prisma.broadcast.updateMany({
      where: { id: { in: stuck.map((b) => b.id) }, status: "sending" },
      data: { status: "failed" },
    });

    const recovered = stuck.map((b) => b.id);
    for (const id of recovered) {
      try {
        await auditService.log({
          action: AuditActions.BROADCAST_SEND_FAILED,
          actorEmail: "system",
          entityType: "broadcast",
          entityId: id,
          success: false,
          errorMessage: "Send interrupted — recovered by reconciliation",
          details: { reason: "stuck_sending" },
        });
      } catch {
        // Reconciliation must not fail because the audit insert did.
      }
    }

    return { recovered: result.count, ids: recovered };
  }

  // ── ticker data (per-user, language-aware) ───────────────────────────────

  async getTickerForUser(userId: string, lang: "en" | "ar") {
    const rows = await prisma.broadcastRecipient.findMany({
      where: {
        userId,
        deliveryStatus: { in: ["sent", "read"] },
        broadcast: { status: "sent", showInTicker: true, tickerActive: true },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { broadcast: true },
    });
    return rows.map((r) => ({
      id: r.broadcastId,
      title: lang === "ar" ? r.broadcast.titleAr : r.broadcast.titleEn,
      message: lang === "ar" ? r.broadcast.messageAr : r.broadcast.messageEn,
      ctaLabel: lang === "ar" ? r.broadcast.ctaLabelAr : r.broadcast.ctaLabelEn,
      externalUrl: r.broadcast.externalUrl,
    }));
  }

  /**
   * Phase F — PUBLIC-website ticker data (no auth): announcements marked
   * public + sent + ticker-active, bilingual per ?lang=.
   */
  async getPublicTicker(lang: "en" | "ar") {
    const rows = await prisma.broadcast.findMany({
      where: {
        status: "sent",
        showInTicker: true,
        tickerActive: true,
        isPublic: true,
      },
      orderBy: { sentAt: "desc" },
      take: 5,
    });
    return rows.map((b) => ({
      id: b.id,
      title: lang === "ar" ? b.titleAr : b.titleEn,
      message: lang === "ar" ? b.messageAr : b.messageEn,
      ctaLabel: lang === "ar" ? b.ctaLabelAr : b.ctaLabelEn,
      externalUrl: b.externalUrl,
    }));
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private assertContent(input: CreateBroadcastInput) {
    for (const field of ["titleEn", "titleAr", "messageEn", "messageAr"] as const) {
      const value = input[field];
      if (!value || typeof value !== "string" || value.trim().length < 3) {
        throw new ValidationError(`${field} is required (min 3 characters)`, {
          [field]: "Required",
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSummary(b: any) {
    const creator = b.createdBy ?? b.creator ?? null;
    const sender = b.sentBy ?? null;
    return {
      id: b.id,
      title_en: b.titleEn,
      title_ar: b.titleAr,
      message_en: b.messageEn,
      message_ar: b.messageAr,
      cta_label_en: b.ctaLabelEn,
      cta_label_ar: b.ctaLabelAr,
      external_url: b.externalUrl,
      image_url: b.imageUrl,
      audience_type: b.audienceType,
      segment_key: b.segmentKey,
      target_user_count: Array.isArray(b.targetUserIds) ? b.targetUserIds.length : null,
      status: b.status,
      scheduled_at: b.scheduledAt,
      sent_at: b.sentAt,
      recipient_count: b.recipientCount ?? b._count?.recipients ?? 0,
      failure_count: b.failureCount,
      show_in_ticker: b.showInTicker,
      is_public: b.isPublic,
      ticker_active: b.tickerActive,
      created_by: creator ? `${creator.firstName} ${creator.lastName}`.trim() : null,
      sent_by: sender ? `${sender.firstName} ${sender.lastName}`.trim() : null,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }
}

export const broadcastService = new BroadcastService();
