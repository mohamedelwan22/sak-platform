export interface HoldingData {
  id: string;
  userId: string;
  landId: string;
  sakOwned: number;
  purchasePricePerSakUsd: number;
  purchaseDate: Date;
  maturityDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HoldingWithRelations extends HoldingData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  land: {
    id: string;
    titleEn: string;
    titleAr: string;
    assetType: string;
    country: string;
    city: string;
    projectId: string | null;
    project?: {
      id: string;
      titleEn: string;
      titleAr: string;
    } | null;
  };
}

export interface CreateHoldingInput {
  userId: string;
  landId: string;
  sakOwned: number;
  purchasePricePerSakUsd: number;
  maturityDate: Date;
  status?: string;
}

export interface UpdateHoldingInput {
  status?: "active" | "matured" | "sold" | "closed";
}

export interface HoldingFilters {
  userId?: string;
  landId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedHoldings {
  data: HoldingWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PortfolioSummary {
  totalInvestedUsd: number;
  currentValueUsd: number;
  totalProfitUsd: number;
  profitPercent: number;
  totalSakOwned: number;
  activeHoldings: number;
  maturedHoldings: number;
  assetAllocation: Array<{
    landId: string;
    titleAr: string;
    sakOwned: number;
    percent: number;
  }>;
}
