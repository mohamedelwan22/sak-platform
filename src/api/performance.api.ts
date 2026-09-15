import type { AxiosResponse } from "axios";
import { apiClient } from "@/api/client";

export interface PerformanceSummary {
  investedUsd: string;
  currentValueUsd: string | null;
  unrealizedPnlUsd: string | null;
  realizedProfitUsd: string;
  pendingPayoutUsd: string;
  totalProfitUsd: string | null;
  roiPercent: string | null;
  totalSakOwned: string;
  activeHoldings: number;
  maturedHoldings: number;
  sakPriceUsd: string | null;
  goldPriceUsd: string | null;
  valuationDate: string | null;
}

export interface PerformancePoint {
  date: string;
  goldPriceUsd: string | null;
  sakPriceUsd: string | null;
  investedSak: string;
  portfolioValueUsd: string | null;
  isCurrent: boolean;
}

export interface PerformanceReturn {
  id: string;
  distributionId: string;
  holdingId: string | null;
  landTitleAr: string | null;
  periodStart: string;
  periodEnd: string;
  payoutUsd: string;
  payoutSak: string;
  ownershipPercent: string;
  date: string;
}

export interface RealizedPeriod {
  periodStart: string;
  periodEnd: string;
  payoutUsd: string;
}

export interface PerformanceAsset {
  landId: string;
  titleAr: string;
  projectTitleAr: string | null;
  sakOwned: string;
  investedUsd: string;
  currentValueUsd: string | null;
  unrealizedPnlUsd: string | null;
  realizedUsd: string;
}

export interface PerformanceReport {
  summary: PerformanceSummary;
  performanceHistory: PerformancePoint[];
  historyInsufficient: boolean;
  returnsHistory: PerformanceReturn[];
  realizedByPeriod: RealizedPeriod[];
  breakdown: {
    totalSakOwned: string;
    assets: PerformanceAsset[];
  };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const performanceApi = {
  getReport: (): Promise<AxiosResponse<ApiEnvelope<PerformanceReport>>> =>
    apiClient.get("/performance"),
};
