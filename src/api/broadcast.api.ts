import { apiClient } from "./client";

export type BroadcastAudienceType = "ALL_INVESTORS" | "ALL_BROKERS" | "SPECIFIC_USERS" | "SEGMENT";

export interface BroadcastDto {
  id: string;
  title_en: string;
  title_ar: string;
  message_en: string;
  message_ar: string;
  cta_label_en: string | null;
  cta_label_ar: string | null;
  external_url: string | null;
  image_url: string | null;
  audience_type: BroadcastAudienceType;
  segment_key: string | null;
  target_user_count: number | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  failure_count: number;
  show_in_ticker: boolean;
  is_public: boolean;
  ticker_active: boolean;
  created_by: string | null;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastSegment {
  key: string;
  labelEn: string;
  labelAr: string;
}

export interface BroadcastUserOption {
  id: string;
  email: string;
  name: string;
  account_number: string;
}

export interface BroadcastRecipientRow {
  id: string;
  user_email: string;
  user_name: string;
  delivery_status: string;
  read_at: string | null;
  created_at: string;
}

export interface CreateBroadcastInput {
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  ctaLabelEn?: string | null;
  ctaLabelAr?: string | null;
  externalUrl?: string | null;
  imageUrl?: string | null;
  audienceType: BroadcastAudienceType;
  targetUserIds?: string[] | null;
  segmentKey?: string | null;
  showInTicker: boolean;
  isPublic?: boolean;
}

export const broadcastApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{
      success: boolean;
      data: { data: BroadcastDto[]; total: number; page: number; totalPages: number };
    }>("/broadcasts", { params }),

  getById: (id: string) =>
    apiClient.get<{
      success: boolean;
      data: BroadcastDto & {
        delivery: Array<{ status: string; count: number }>;
        recipients: BroadcastRecipientRow[];
      };
    }>(`/broadcasts/${id}`),

  create: (input: CreateBroadcastInput) =>
    apiClient.post<{ success: boolean; data: { id: string; status: string } }>(
      "/broadcasts",
      input,
    ),

  update: (id: string, input: Partial<CreateBroadcastInput>) =>
    apiClient.patch<{ success: boolean; data: { id: string; status: string } }>(
      `/broadcasts/${id}`,
      input,
    ),

  send: (id: string) =>
    apiClient.post<{ success: boolean; data: { recipientCount: number; failureCount: number } }>(
      `/broadcasts/${id}/send`,
    ),

  cancel: (id: string) =>
    apiClient.post<{ success: boolean; data: { id: string; status: string } }>(
      `/broadcasts/${id}/cancel`,
    ),

  setTickerActive: (id: string, active: boolean) =>
    apiClient.patch<{ success: boolean; data: { id: string; ticker_active: boolean } }>(
      `/broadcasts/${id}/ticker`,
      { active },
    ),

  previewAudience: (input: {
    audienceType: BroadcastAudienceType;
    targetUserIds?: string[] | null;
    segmentKey?: string | null;
  }) =>
    apiClient.post<{ success: boolean; data: { count: number; sample: BroadcastUserOption[] } }>(
      "/broadcasts/preview-audience",
      input,
    ),

  segments: () =>
    apiClient.get<{ success: boolean; data: BroadcastSegment[] }>("/broadcasts/segments"),

  users: (params?: { search?: string; limit?: number }) =>
    apiClient.get<{ success: boolean; data: BroadcastUserOption[] }>("/broadcasts/users", {
      params,
    }),
};
