import type { Request, Response } from "express";
import { sendSuccess, sendNotFound } from "../../../common/responses/index.js";
import { HttpStatus } from "../../../common/responses/http-status.js";
import { NotFoundError } from "../../../lib/errors.js";
import { NotificationService } from "../services/notifications.service.js";
import { NotificationRepository } from "../repositories/notifications.repository.js";
import { auditService } from "../../audit/controllers/audit.controller.js";
import { AuditActions } from "../../audit/constants/index.js";

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

export class NotificationController {
  async findAll(req: Request, res: Response): Promise<void> {
    const { type, isRead, search, sortBy, sortOrder, page, limit } = req.query;
    const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
    const userId = (req.query.userId as string) || (isStaff ? undefined : req.user?.userId);
    const result = await notificationService.findAll({
      userId: userId as string | undefined,
      type: type as string | undefined,
      isRead: isRead as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    sendSuccess(res, result, "Notifications retrieved");
  }

  async findById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const notification = await notificationService.findById(id as string);
      sendSuccess(res, notification, "Notification retrieved");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Notification not found");
        return;
      }
      throw err;
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const isStaff = req.user?.role === "admin" || req.user?.role === "super_admin";
    const userId = (req.query.userId as string) || (isStaff ? undefined : req.user?.userId);
    const count = await notificationService.getUnreadCount(userId as string);
    sendSuccess(res, { count }, "Unread count retrieved");
  }

  async create(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.create(req.body);
    auditService.logFromRequest(req, {
      action: AuditActions.NOTIFICATION_CREATED,
      entityType: "notification",
      entityId: notification.id,
      newValues: notification as unknown as Record<string, unknown>,
      success: true,
    });
    sendSuccess(res, notification, "Notification created", HttpStatus.CREATED);
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const notification = await notificationService.markAsRead(id as string);
      sendSuccess(res, notification, "Notification marked as read");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Notification not found");
        return;
      }
      throw err;
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.body.userId || req.user?.userId;
    if (!userId) {
      sendNotFound(res, "User ID is required");
      return;
    }
    const count = await notificationService.markAllAsRead(userId);
    sendSuccess(res, { count }, "All notifications marked as read");
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const notification = await notificationService.findById(id as string);
      await notificationService.delete(id as string);
      auditService.logFromRequest(req, {
        action: AuditActions.NOTIFICATION_DELETED,
        entityType: "notification",
        entityId: id as string,
        oldValues: notification as unknown as Record<string, unknown>,
        success: true,
      });
      sendSuccess(res, null, "Notification deleted");
    } catch (err) {
      if (err instanceof NotFoundError) {
        sendNotFound(res, "Notification not found");
        return;
      }
      throw err;
    }
  }
}
