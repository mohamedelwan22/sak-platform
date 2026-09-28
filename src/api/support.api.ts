import { apiClient } from "./client";

export type TicketStatus = "open" | "in_progress" | "waiting_for_investor" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface SupportAttachmentDto {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  created_at: string;
}

export interface SupportTicketSummary {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: { id: string; name: string; email: string } | null;
  user: { id: string; name: string; email: string } | null;
  message_count: number;
  attachment_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessageDto {
  id: string;
  body: string;
  sender_role: string | null;
  sender: { id: string; name: string; email: string } | null;
  attachments: SupportAttachmentDto[];
  created_at: string;
  edited_at: string | null;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  resolved_at: string | null;
  closed_at: string | null;
  assigned_by: { id: string; name: string } | null;
  messages: SupportMessageDto[];
}

export interface SupportPaginatedList {
  data: SupportTicketSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupportMeta {
  categories: string[];
  priorities: string[];
}

export interface SupportAssignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TicketAuditPage {
  data: Array<{
    id: string;
    action: string;
    actorEmail: string;
    actorRole: string | null;
    createdAt: string;
    success: boolean;
    details: Record<string, unknown> | null;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
  }>;
  total: number;
}

export const supportApi = {
  list: (params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) =>
    apiClient.get<{ success: boolean; data: SupportPaginatedList; message: string }>(
      "/support/tickets",
      { params },
    ),

  adminList: (params?: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
    assignedTo?: string;
    userId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) =>
    apiClient.get<{ success: boolean; data: SupportPaginatedList; message: string }>(
      "/support/admin/tickets",
      { params },
    ),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: SupportTicketDetail; message: string }>(
      `/support/tickets/${id}`,
    ),

  adminGetById: (id: string) =>
    apiClient.get<{ success: boolean; data: SupportTicketDetail; message: string }>(
      `/support/admin/tickets/${id}`,
    ),

  getAudit: (id: string) =>
    apiClient.get<{ success: boolean; data: TicketAuditPage; message: string }>(
      `/support/admin/tickets/${id}/audit`,
    ),

  getMeta: () =>
    apiClient.get<{ success: boolean; data: SupportMeta; message: string }>("/support/admin/meta"),

  getAssignees: () =>
    apiClient.get<{ success: boolean; data: SupportAssignee[]; message: string }>(
      "/support/admin/assignees",
    ),

  /** Create ticket — multipart with optional attachments. */
  create: (input: { category: string; subject: string; message: string; files?: File[] }) => {
    const fd = new FormData();
    fd.append("category", input.category);
    fd.append("subject", input.subject);
    fd.append("message", input.message);
    for (const f of input.files ?? []) fd.append("files", f);
    return apiClient.post<{
      success: boolean;
      data: { id: string; ticket_number: string };
      message: string;
    }>("/support/tickets", fd, { headers: { "Content-Type": "multipart/form-data" } });
  },

  /** Reply with optional attachments (investor or staff path). */
  reply: (id: string, message: string, files?: File[], admin = false) => {
    const fd = new FormData();
    fd.append("message", message);
    for (const f of files ?? []) fd.append("files", f);
    const path = admin ? `/support/admin/tickets/${id}/reply` : `/support/tickets/${id}/messages`;
    return apiClient.post<{ success: boolean; data: { message_id: string }; message: string }>(
      path,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  /** Status transition (owner close/reopen or staff transitions). */
  setStatus: (id: string, status: TicketStatus) =>
    apiClient.patch<{
      success: boolean;
      data: { id: string; status: TicketStatus };
      message: string;
    }>(`/support/tickets/${id}/status`, { status }),

  /** Admin status/priority updates. */
  adminUpdate: (id: string, data: { status?: TicketStatus; priority?: TicketPriority }) =>
    apiClient.patch<{
      success: boolean;
      data: { id: string; status: TicketStatus; priority: TicketPriority };
      message: string;
    }>(`/support/admin/tickets/${id}`, data),

  /** Admin assignment/reassignment. */
  adminAssign: (id: string, assigneeId: string) =>
    apiClient.post<{
      success: boolean;
      data: { id: string; assigned_to: string };
      message: string;
    }>(`/support/admin/tickets/${id}/assign`, { assigneeId }),

  /**
   * Downloads an attachment as a Blob through the authenticated client.
   *
   * The endpoint is deliberately NOT public and the token is never placed in a
   * URL. Going through `apiClient` also means the Authorization header and the
   * 401 refresh-and-retry interceptor apply, which a plain <a href> navigation
   * cannot do.
   */
  downloadAttachment: (ticketId: string, attachment: SupportAttachmentDto, admin = false) => {
    const path = admin
      ? `/support/admin/tickets/${ticketId}/attachments/${attachment.id}`
      : `/support/tickets/${ticketId}/attachments/${attachment.id}`;
    return apiClient.get<Blob>(path, { responseType: "blob" });
  },

  /**
   * The raw path, kept for display/debug only.
   * Never use this as an href: a browser navigation sends no Authorization
   * header and will receive 401.
   */
  attachmentUrl: (attachment: SupportAttachmentDto) => attachment.url,
};
