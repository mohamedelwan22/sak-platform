import type { NotificationType } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import type { NotificationRepository } from "../repositories/notifications.repository.js";
import type {
  NotificationData,
  NotificationWithUser,
  CreateNotificationInput,
  NotificationFilters,
  PaginatedNotifications,
} from "../types/index.js";

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async findAll(filters: NotificationFilters): Promise<PaginatedNotifications> {
    return this.notificationRepository.findAll(filters);
  }

  async findById(id: string): Promise<NotificationWithUser> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) throw new NotFoundError("Notification not found");
    return notification;
  }

  async create(input: CreateNotificationInput): Promise<NotificationData | null> {
    return this.notificationRepository.create(input);
  }

  async markAsRead(id: string): Promise<NotificationData> {
    const existing = await this.notificationRepository.findById(id);
    if (!existing) throw new NotFoundError("Notification not found");
    return this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.notificationRepository.findById(id);
    if (!existing) throw new NotFoundError("Notification not found");
    await this.notificationRepository.delete(id);
  }

  async listPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { channel: "asc" }],
    });
  }

  async setPreference(userId: string, input: { type: string; channel: string; enabled: boolean }) {
    const type = input.type as NotificationType;
    return prisma.notificationPreference.upsert({
      where: { userId_type_channel: { userId, type, channel: input.channel } },
      create: {
        userId,
        type,
        channel: input.channel,
        enabled: input.enabled,
      },
      update: { enabled: input.enabled },
    });
  }
}
