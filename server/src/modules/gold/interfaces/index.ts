import type {
  GoldPriceData,
  CreateGoldPriceInput,
  GoldPriceFilters,
  PaginatedGoldPrices,
} from "../types/index.js";

export interface IGoldPriceRepository {
  findAll(filters: GoldPriceFilters): Promise<PaginatedGoldPrices>;
  findById(id: string): Promise<GoldPriceData | null>;
  findLatest(): Promise<GoldPriceData | null>;
  create(data: CreateGoldPriceInput): Promise<GoldPriceData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  getStatistics(period: "daily" | "weekly" | "monthly"): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  } | null>;
}
