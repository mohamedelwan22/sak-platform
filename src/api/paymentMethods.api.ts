import { apiClient } from "./client";

export interface PaymentMethodDto {
  id: string;
  type: "bank_transfer" | "card" | "other";
  label: string | null;
  masked: string | null;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface CreatePaymentMethodInput {
  type: PaymentMethodDto["type"];
  label?: string;
  details?: Record<string, string>;
}

export const paymentMethodsApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: PaymentMethodDto[]; message: string }>(
      "/payment-methods",
    ),

  create: (input: CreatePaymentMethodInput) =>
    apiClient.post<{ success: boolean; data: PaymentMethodDto; message: string }>(
      "/payment-methods",
      {
        type: input.type,
        label: input.label,
        details: input.details,
      },
    ),

  setDefault: (id: string) =>
    apiClient.patch<{ success: boolean; data: PaymentMethodDto; message: string }>(
      `/payment-methods/${id}`,
      { setDefault: true },
    ),

  updateLabel: (id: string, label: string | null) =>
    apiClient.patch<{ success: boolean; data: PaymentMethodDto; message: string }>(
      `/payment-methods/${id}`,
      { label },
    ),

  remove: (id: string) =>
    apiClient.delete<{ success: boolean; data: null; message: string }>(`/payment-methods/${id}`),
};
