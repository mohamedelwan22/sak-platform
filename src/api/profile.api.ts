import { apiClient } from "./client";

export const profileApi = {
  me: () => apiClient.get("/profile/me"),
  wallet: () => apiClient.get("/profile/wallet"),
  holdings: () => apiClient.get("/profile/holdings"),
  transactions: () => apiClient.get("/profile/transactions"),
  paymentRequests: () => apiClient.get("/profile/payment-requests"),
  createPaymentRequest: (data: {
    type: string;
    usdAmount: number;
    method?: string;
    proofPath?: string;
  }) => apiClient.post("/profile/payment-requests", data),
  kyc: () => apiClient.get("/profile/kyc"),
  uploadKyc: (formData: FormData) =>
    apiClient.post("/kyc", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  uploadPaymentProof: (formData: FormData) =>
    apiClient.post("/payments", formData, { headers: { "Content-Type": "multipart/form-data" } }),
};
