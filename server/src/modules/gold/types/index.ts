export interface GoldPriceData {
  id: string;
  gramPriceUsd: number;
  source: string;
  createdAt: Date;
}

export interface CreateGoldPriceInput {
  gramPriceUsd: number;
  source?: string;
}

export interface UpdateGoldPriceInput {
  gramPriceUsd?: number;
  source?: string;
}

export interface GoldPriceFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedGoldPrices {
  data: GoldPriceData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GoldPriceStatistics {
  daily: GoldPriceStat | null;
  weekly: GoldPriceStat | null;
  monthly: GoldPriceStat | null;
}

export interface GoldPriceStat {
  min: number;
  max: number;
  avg: number;
  count: number;
  period: string;
}
