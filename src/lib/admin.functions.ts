import { adminDataApi } from "@/api/admin-data.api";

export interface AdminStats {
  investors: number;
  pendingKyc: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  lands: number;
  totalSakInvested: number;
  aumUsd: number;
  sakPrice: number;
}

export interface AdminKycItem {
  id: string;
  userId: string;
  document_type: string;
  front_image_path: string | null;
  back_image_path: string | null;
  selfie_image_path: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string; email: string };
}

export interface AdminPaymentItem {
  id: string;
  userId: string;
  type: string;
  method: string;
  usd_amount: string | number;
  currency: string;
  sak_amount: string | number | null;
  proof_path: string | null;
  status: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string; email: string };
}

export async function adminStats(): Promise<AdminStats> {
  const res = await adminDataApi.stats();
  const d = res.data.data as Record<string, unknown>;
  return {
    investors: d.investorCount as number,
    pendingKyc: d.pendingKycCount as number,
    pendingDeposits: d.pendingDeposits as number,
    pendingWithdrawals: d.pendingWithdrawals as number,
    lands: d.totalLands as number,
    totalSakInvested: d.totalSakInvested as number,
    aumUsd: d.portfolioValueUsd as number,
    sakPrice: d.sakPrice as number,
  };
}

export async function adminListKyc(status: string): Promise<AdminKycItem[]> {
  const res = await adminDataApi.kycList({ status });
  const body = res.data.data as { data: AdminKycItem[]; total: number };
  return body.data ?? [];
}

export async function adminReviewKyc(input: { id: string; approve: boolean; reason?: string }) {
  if (input.approve) {
    const res = await adminDataApi.kycApprove(input.id);
    return res.data.data;
  }
  const res = await adminDataApi.kycReject(input.id, { adminNotes: input.reason });
  return res.data.data;
}

export async function adminListPayments(type: string): Promise<AdminPaymentItem[]> {
  const res = await adminDataApi.paymentList({ type });
  const body = res.data.data as { data: AdminPaymentItem[]; total: number };
  return body.data ?? [];
}

export async function adminReviewPayment(input: { id: string; approve: boolean; reason?: string }) {
  if (input.approve) {
    const res = await adminDataApi.paymentApprove(input.id);
    return res.data.data;
  }
  const res = await adminDataApi.paymentReject(input.id, { adminNotes: input.reason });
  return res.data.data;
}

export async function adminListInvestors() {
  const res = await adminDataApi.investorList();
  const body = res.data.data as { data: unknown[]; total: number };
  return body.data ?? [];
}

export async function adminSaveLand(data: Record<string, unknown>) {
  if (data.id) {
    const res = await adminDataApi.landUpdate(data.id as string, data);
    return res.data.data;
  }
  const res = await adminDataApi.landSave(data);
  return res.data.data;
}

export async function adminListLands() {
  const res = await adminDataApi.landList();
  const data = res.data.data;
  return Array.isArray(data) ? data : (data.data ?? []);
}
