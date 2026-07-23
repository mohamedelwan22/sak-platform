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

export interface AdminLandItem {
  id: string;
  project_id: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  asset_type: string;
  country: string;
  city: string;
  area_m2: string | number;
  total_sak_inventory: string | number;
  available_sak: string | number;
  sold_sak: number;
  holding_count: number;
  maturity_months: number;
  expected_roi: string | number;
  risk_level: string;
  cover_image_url: string | null;
  gallery: unknown[];
  documents: unknown[];
  lat: string | number | null;
  lng: string | number | null;
  status: string;
  created_at: string;
  updated_at: string;
  _count?: { holdings: number };
  project?: { id: string; titleAr: string; titleEn: string } | null;
}

export async function adminListLands(params?: {
  search?: string;
  status?: string;
  assetType?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: AdminLandItem[]; total: number; page: number; limit: number; totalPages: number }> {
  const res = await adminDataApi.landList(params);
  return res.data.data;
}

export async function adminGetLand(id: string): Promise<AdminLandItem> {
  const res = await adminDataApi.landGetById(id);
  return res.data.data;
}

export async function adminSaveLand(data: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    titleAr: data.title_ar,
    titleEn: data.title_en,
    descriptionAr: data.description_ar || "",
    descriptionEn: data.description_en || "",
    assetType: data.asset_type,
    country: data.country,
    city: data.city || "",
    areaM2: Number(data.area_m2),
    totalSakInventory: Number(data.total_sak_inventory),
    availableSak: Number(data.available_sak),
    maturityMonths: Number(data.maturity_months),
    expectedRoi: Number(data.expected_roi),
    riskLevel: data.risk_level === "none" ? "low" : data.risk_level,
    coverImageUrl: data.cover_image_url || null,
    gallery: data.gallery ?? [],
    documents: data.documents ?? [],
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    status: data.status,
    projectId: data.project_id || null,
  };
  if (data.id) {
    const res = await adminDataApi.landUpdate(data.id as string, payload);
    return res.data.data;
  }
  const res = await adminDataApi.landSave(payload);
  return res.data.data;
}

export async function adminDeleteLand(id: string) {
  const res = await adminDataApi.landDelete(id);
  return res.data.data;
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

// Admin Projects

export interface AdminProjectItem {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  country: string;
  city: string;
  cover_image_url: string | null;
  gallery: unknown[];
  documents: unknown[];
  status: string;
  risk_level: string;
  expected_roi: string | number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  _count?: { lands: number };
}

export async function adminListProjects(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: AdminProjectItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const res = await adminDataApi.projectList(params);
  const raw = res.data.data;
  const mapped = (raw.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    title_ar: p.titleAr,
    title_en: p.titleEn,
    description_ar: p.descriptionAr ?? "",
    description_en: p.descriptionEn ?? "",
    country: p.country,
    city: p.city ?? "",
    cover_image_url: p.coverImageUrl ?? null,
    gallery: p.gallery ?? [],
    documents: p.documents ?? [],
    status: p.status,
    risk_level: p.riskLevel,
    expected_roi: p.expectedRoi,
    sort_order: p.sortOrder,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    _count: p._count,
  }));
  return { data: mapped, total: raw.total, page: raw.page, limit: raw.limit, totalPages: raw.totalPages };
}

export async function adminSaveProject(data: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    titleAr: data.title_ar,
    titleEn: data.title_en,
    country: data.country,
    city: data.city || "",
    descriptionAr: data.description_ar || "",
    descriptionEn: data.description_en || "",
    coverImageUrl: data.cover_image_url || null,
    status: data.status === "draft" ? "active" : data.status,
    riskLevel: data.risk_level === "none" ? "low" : data.risk_level,
    expectedRoi: Number(data.expected_roi),
    sortOrder: Number(data.sort_order),
  };
  if (data.id) {
    const res = await adminDataApi.projectUpdate(data.id as string, payload);
    return res.data.data;
  }
  const res = await adminDataApi.projectSave(payload);
  return res.data.data;
}

export async function adminDeleteProject(id: string) {
  const res = await adminDataApi.projectDelete(id);
  return res.data.data;
}

// Admin Gold

export interface AdminGoldPriceItem {
  id: string;
  gram_price_usd: string | number;
  source: string;
  created_at: string;
}

export async function adminListGoldPrices(params?: { page?: number; limit?: number }): Promise<{
  data: AdminGoldPriceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const res = await adminDataApi.goldList(params);
  const raw = res.data.data;
  const mapped = (raw.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    gram_price_usd: p.gramPriceUsd,
    source: p.source ?? "manual",
    created_at: p.createdAt,
  }));
  return { data: mapped, total: raw.total, page: raw.page, limit: raw.limit, totalPages: raw.totalPages };
}

export async function adminCreateGoldPrice(data: { gram_price_usd: number; source?: string }) {
  const payload = { gramPriceUsd: data.gram_price_usd, source: data.source || "manual" };
  const res = await adminDataApi.goldCreate(payload);
  return res.data.data;
}

export async function adminDeleteGoldPrice(id: string) {
  const res = await adminDataApi.goldDelete(id);
  return res.data.data;
}

export async function adminGoldStatistics(period?: string): Promise<unknown> {
  const res = await adminDataApi.goldStatistics({ period });
  return res.data.data;
}

// Admin SAK Config

export interface AdminSakConfigItem {
  id: string;
  sak_to_gold_ratio: string | number;
  sell_fee_percent: string | number;
  effective_from: string;
  created_at: string;
}

export async function adminListSakConfigs(): Promise<AdminSakConfigItem[]> {
  const res = await adminDataApi.sakConfigAll();
  const d = res.data.data;
  const list = Array.isArray(d) ? d : (d.data ?? []);
  return list.map((c: Record<string, unknown>) => ({
    id: c.id,
    sak_to_gold_ratio: c.sakToGoldRatio,
    sell_fee_percent: c.sellFeePercent,
    effective_from: c.effectiveFrom,
    created_at: c.createdAt,
  }));
}

export async function adminSaveSakConfig(data: Record<string, unknown>) {
  const payload: Record<string, unknown> = {
    sakToGoldRatio: Number(data.sak_to_gold_ratio),
    sellFeePercent: Number(data.sell_fee_percent),
    effectiveFrom: data.effective_from,
  };
  if (data.id) {
    const res = await adminDataApi.sakConfigUpdate(data.id as string, payload);
    return res.data.data;
  }
  const res = await adminDataApi.sakConfigSave(payload);
  return res.data.data;
}

export async function adminDeleteSakConfig(id: string) {
  const res = await adminDataApi.sakConfigDelete(id);
  return res.data.data;
}
