import { z } from "zod";
import { NOTIFICATION_TYPES } from "../constants/index.js";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required").regex(uuidRegex, "Invalid user ID format"),
  title: z.string().min(1, "Title is required").max(255, "Title must be at most 255 characters"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export const listNotificationsSchema = z.object({
  userId: z.string().regex(uuidRegex, "Invalid user ID format").optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  isRead: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const markAllAsReadSchema = z.object({
  userId: z.string().regex(uuidRegex, "Invalid user ID format").optional(),
});
