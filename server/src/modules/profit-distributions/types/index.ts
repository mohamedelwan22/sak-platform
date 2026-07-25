import type { Prisma } from "@prisma/client";

export interface ProfitDistributionData {
  id: string;
  landId: string;
  totalProfitUsd: number;
  periodStart: Date;
  periodEnd: Date;
  distributedBy: string;
  distributedAt: Date;
  createdAt: Date;
}

export interface ProfitDistributionWithLand extends ProfitDistributionData {
  land: {
    id: string;
    titleEn: string;
    titleAr: string;
    projectId: string | null;
  };
  distributor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ProfitDistributionWithPayouts extends ProfitDistributionWithLand {
  payouts: ProfitPayoutData[];
}

export interface ProfitPayoutData {
  id: string;
  distributionId: string;
  userId: string;
  holdingId: string;
  ownershipPercent: number;
  payoutUsd: number;
  payoutSak: number;
  status: string;
  createdAt: Date;
}

export interface ProfitPayoutWithUser extends ProfitPayoutData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateProfitDistributionInput {
  landId: string;
  totalProfitUsd: number;
  periodStart: Date;
  periodEnd: Date;
  distributedBy: string;
  payouts: CreateProfitPayoutInput[];
}

export interface CreateProfitPayoutInput {
  userId: string;
  holdingId: string;
  ownershipPercent: number;
  payoutUsd: number;
  payoutSak: number;
}

export interface ProfitDistributionFilters {
  landId?: string;
  distributedBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ProfitPayoutFilters {
  distributionId?: string;
  userId?: string;
  holdingId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedProfitDistributions {
  data: ProfitDistributionWithLand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedProfitPayouts {
  data: ProfitPayoutWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ProfitDistributionPreviewItem {
  holdingId: string;
  userId: string;
  userFullName: string;
  sakOwned: number;
  ownershipPercent: number;
  payoutUsd: number;
  payoutSak: number;
}

export interface ProfitDistributionPreview {
  landId: string;
  landTitleEn: string;
  landTitleAr: string;
  totalSakInventory: number;
  totalSakOwned: number;
  totalProfitUsd: number;
  items: ProfitDistributionPreviewItem[];
}

export type { Prisma };
