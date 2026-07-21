import type {
  NotificationData,
  NotificationWithUser,
  CreateNotificationInput,
  NotificationFilters,
  PaginatedNotifications,
} from "../types/index.js";

export interface INotificationRepository {
  findAll(filters: NotificationFilters): Promise<PaginatedNotifications>;
  findById(id: string): Promise<NotificationWithUser | null>;
  create(data: CreateNotificationInput): Promise<NotificationData>;
  markAsRead(id: string): Promise<NotificationData>;
  markAllAsRead(userId: string): Promise<number>;
  getUnreadCount(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
