import { apiClient } from "./client";

export interface SupportTicketSummary {
  id: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  message_count: number;
  user: { id: string; first_name: string; last_name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessageDto {
  id: string;
  body: string;
  sender: { id: string; first_name: string; last_name: string; email: string } | null;
  created_at: string;
}

export interface SupportTicketDetail {
  id: string;
  category: string;
  subject: string;
  status: SupportTicketSummary["status"];
  priority: SupportTicketSummary["priority"];
  user: SupportTicketSummary["user"];
  messages: SupportMessageDto[];
  created_at: string;
  updated_at: string;
}

export interface SupportPaginatedList {
  data: SupportTicketSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const supportApi = {
  list: (params?: { status?: string; category?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: SupportPaginatedList; message: string }>("/support", {
      params,
    }),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: SupportTicketDetail; message: string }>(
      `/support/${id}`,
    ),

  create: (input: { subject: string; category: string; body: string }) =>
    apiClient.post<{ success: boolean; data: { id: string }; message: string }>("/support", input),

  reply: (id: string, body: string) =>
    apiClient.put<{ success: boolean; data: { id: string }; message: string }>(`/support/${id}`, {
      body,
    }),

  close: (id: string) =>
    apiClient.put<{ success: boolean; data: { id: string }; message: string }>(`/support/${id}`, {
      status: "closed",
    }),
};
