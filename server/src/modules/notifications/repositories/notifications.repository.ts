import type { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { INotificationRepository } from "../interfaces/index.js";
import type {
  NotificationData,
  NotificationWithUser,
  CreateNotificationInput,
  NotificationFilters,
  PaginatedNotifications,
} from "../types/index.js";

const notificationWithUserSelect = {
  id: true,
  userId: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} satisfies Prisma.NotificationSelect;

type NotificationWithUserRow = Prisma.NotificationGetPayload<{
  select: typeof notificationWithUserSelect;
}>;

const notificationSelect = {
  id: true,
  userId: true,
  title: true,
  message: true,
  type: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationRow = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;

export class NotificationRepository implements INotificationRepository {
  async findAll(filters: NotificationFilters): Promise<PaginatedNotifications> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: notificationWithUserSelect,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: data.map(this.mapNotificationWithUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<NotificationWithUser | null> {
    const notification = await prisma.notification.findUnique({
      where: { id },
      select: notificationWithUserSelect,
    });
    return notification ? this.mapNotificationWithUser(notification) : null;
  }

  async create(data: CreateNotificationInput): Promise<NotificationData> {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: (data.type as NotificationType) ?? "system",
      },
      select: notificationSelect,
    });
    return this.mapNotification(notification);
  }

  async markAsRead(id: string): Promise<NotificationData> {
    const notification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: notificationSelect,
    });
    return this.mapNotification(notification);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({
      where: { id },
    });
  }

  private buildWhereClause(filters: NotificationFilters): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.type) {
      where.type = filters.type as NotificationType;
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead === "true";
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { message: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: NotificationFilters): Prisma.NotificationOrderByWithRelationInput {
    const allowed = ["title", "message", "type", "isRead", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  private mapNotificationWithUser(row: NotificationWithUserRow): NotificationWithUser {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.isRead,
      readAt: row.readAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.user.id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
      },
    };
  }

  private mapNotification(row: NotificationRow): NotificationData {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.isRead,
      readAt: row.readAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
