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

export interface AdminChartData {
  months: string[];
  deposits: number[];
  withdrawals: number[];
  registrations: number[];
  transactions: number[];
}

export interface AdminActivity {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string;
  actorRole: string;
  createdAt: string;
  success: boolean;
}

export interface AdminStatsExtended extends AdminStats {
  activeInvestors: number;
  approvedKycCount: number;
  rejectedKycCount: number;
  walletBalanceSum: number;
  totalTransactions: number;
  approvedDeposits: number;
  approvedWithdrawals: number;
  totalPaymentVolume: number;
  monthlyDeposits: number;
  monthlyWithdrawals: number;
  monthlyRegistrations: number;
  totalCountries: number;
  totalCities: number;
  totalProjects: number;
  totalHoldings: number;
}

export async function adminStatsExtended(): Promise<AdminStatsExtended> {
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
    activeInvestors: d.activeInvestors as number,
    approvedKycCount: d.approvedKycCount as number,
    rejectedKycCount: d.rejectedKycCount as number,
    walletBalanceSum: d.walletBalanceSum as number,
    totalTransactions: d.totalTransactions as number,
    approvedDeposits: d.approvedDeposits as number,
    approvedWithdrawals: d.approvedWithdrawals as number,
    totalPaymentVolume: d.totalPaymentVolume as number,
    monthlyDeposits: d.monthlyDeposits as number,
    monthlyWithdrawals: d.monthlyWithdrawals as number,
    monthlyRegistrations: d.monthlyRegistrations as number,
    totalCountries: d.totalCountries as number,
    totalCities: d.totalCities as number,
    totalProjects: d.totalProjects as number,
    totalHoldings: d.totalHoldings as number,
  };
}

export async function adminChartData(): Promise<AdminChartData> {
  const res = await adminDataApi.chartData();
  return res.data.data as AdminChartData;
}

export async function adminActivity(): Promise<AdminActivity[]> {
  const res = await adminDataApi.activity();
  const d = res.data.data;
  return Array.isArray(d) ? d : [];
}

export async function adminExportCsv(entity: string, params?: Record<string, string>) {
  const res = await adminDataApi.exportCsv(entity, params);
  return res.data;
}
