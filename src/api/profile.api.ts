import { apiClient } from "./client";

export interface ProfileDto {
  id: string;
  email: string;
  accountNumber?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  emailVerified?: boolean;
  createdAt: string;
  updatedAt: string;
  role: string | { name: string };
  kyc_status?: string;
}

export const profileApi = {
  me: () => apiClient.get<{ success: boolean; data: ProfileDto }>("/profile/me"),

  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string | null }) =>
    apiClient.patch<{ success: boolean; data: ProfileDto }>("/profile", data),

  uploadAvatar: (formData: FormData) =>
    apiClient.post<{ success: boolean; data: { avatarUrl: string } }>("/profile/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  downloadAvatar: () => apiClient.get<Blob>("/profile/avatar", { responseType: "blob" }),

  deleteAvatar: () =>
    apiClient.delete<{ success: boolean; data: { avatarUrl: null } }>("/profile/avatar"),

  wallet: () => apiClient.get("/profile/wallet"),
  holdings: () => apiClient.get("/profile/holdings"),
  transactions: (params?: {
    type?: string;
    direction?: string;
    status?: string;
    from?: string;
    to?: string;
  }) => apiClient.get("/profile/transactions", { params }),
  paymentRequests: () => apiClient.get("/profile/payment-requests"),
  createPaymentRequest: (data: {
    type: string;
    usdAmount: number;
    method?: string;
    proofPath?: string;
    paymentMethodId?: string | null;
  }) => apiClient.post("/profile/payment-requests", data),
  kyc: () => apiClient.get("/profile/kyc"),
  uploadKyc: (formData: FormData) =>
    apiClient.post("/kyc", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  uploadPaymentProof: (formData: FormData) =>
    apiClient.post("/payments", formData, { headers: { "Content-Type": "multipart/form-data" } }),

  profitDistributions: () => apiClient.get("/profit-distributions/my-payouts"),
  certificates: () => apiClient.get("/certificates"),
  generateCertificate: (holdingId: string) => apiClient.post("/certificates", { holdingId }),
  downloadCertificate: (id: string) =>
    apiClient.get(`/certificates/${id}/download`, { responseType: "blob" }),
};
