export interface GoldPriceData {
  id: string;
  gramPriceUsd: number;
  pricePerOunce: number;
  pricePerGram: number;
  currency: string;
  source: string;
  sourceUpdatedAt: Date | null;
  fetchedAt: Date;
  createdAt: Date;
}

export interface CreateGoldPriceInput {
  /** Price per gram USD (legacy manual-entry field). */
  gramPriceUsd?: number;
  /** Price per troy ounce USD. */
  pricePerOunce?: number;
  /** Price per gram USD. */
  pricePerGram?: number;
  currency?: string;
  source?: string;
  sourceUpdatedAt?: Date;
}

export interface UpdateGoldPriceInput {
  gramPriceUsd?: number;
  pricePerOunce?: number;
  pricePerGram?: number;
  currency?: string;
  source?: string;
}

export interface GoldPriceFilters {
  page?: number;
  limit?: number;
  from?: Date;
  to?: Date;
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
