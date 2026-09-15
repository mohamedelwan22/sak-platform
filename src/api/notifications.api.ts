import { apiClient } from "./client";
import type { Notification, PaginationParams } from "@/types";

interface PaginatedList<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface NotificationListParams extends PaginationParams {
  userId?: string;
  type?: string;
  isRead?: string;
  search?: string;
}

export interface NotificationPreference {
  id: string;
  type: string;
  channel: string;
  enabled: boolean;
}

export const notificationsApi = {
  list: (params?: NotificationListParams) =>
    apiClient.get<{ success: boolean; data: PaginatedList<Notification>; timestamp: string }>(
      "/notifications",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: Notification; message: string; timestamp: string }>(
      `/notifications/${id}`,
    ),

  getUnreadCount: (userId?: string) =>
    apiClient.get<{ success: boolean; data: { count: number }; timestamp: string }>(
      "/notifications/unread/count",
      { params: userId ? { userId } : undefined },
    ),

  create: (data: { userId: string; title: string; message: string; type?: string }) =>
    apiClient.post<{ success: boolean; data: Notification; message: string; timestamp: string }>(
      "/notifications",
      data,
    ),

  markAsRead: (id: string) =>
    apiClient.post<{ success: boolean; data: Notification; message: string; timestamp: string }>(
      `/notifications/${id}/read`,
    ),

  markAllAsRead: (userId: string) =>
    apiClient.post<{ success: boolean; data: null; message: string; timestamp: string }>(
      "/notifications/read-all",
      { userId },
    ),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string; timestamp: string }>(
      `/notifications/${id}`,
    ),

  getPreferences: () =>
    apiClient.get<{ success: boolean; data: NotificationPreference[] }>(
      "/notifications/preferences",
    ),

  setPreference: (data: { type: string; channel: string; enabled: boolean }) =>
    apiClient.put<{ success: boolean; data: NotificationPreference }>(
      "/notifications/preferences",
      data,
    ),
};
