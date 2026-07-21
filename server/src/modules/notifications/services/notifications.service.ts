import { NotFoundError } from "../../../lib/errors.js";
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

  async create(input: CreateNotificationInput): Promise<NotificationData> {
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
}
