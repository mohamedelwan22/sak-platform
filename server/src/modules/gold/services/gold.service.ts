import { NotFoundError } from "../../../lib/errors.js";
import type { GoldRepository } from "../repositories/gold.repository.js";
import type {
  GoldPriceData,
  CreateGoldPriceInput,
  GoldPriceFilters,
  PaginatedGoldPrices,
  GoldPriceStat,
} from "../types/index.js";

export class GoldService {
  constructor(private readonly goldRepository: GoldRepository) {}

  async findAll(filters: GoldPriceFilters): Promise<PaginatedGoldPrices> {
    return this.goldRepository.findAll(filters);
  }

  async findById(id: string): Promise<GoldPriceData> {
    const price = await this.goldRepository.findById(id);
    if (!price) throw new NotFoundError("Gold price not found");
    return price;
  }

  async findLatest(): Promise<GoldPriceData | null> {
    return this.goldRepository.findLatest();
  }

  async create(input: CreateGoldPriceInput): Promise<GoldPriceData> {
    if (input.gramPriceUsd <= 0) {
      throw new NotFoundError("Price must be greater than 0");
    }
    return this.goldRepository.create(input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.goldRepository.findById(id);
    if (!existing) throw new NotFoundError("Gold price not found");
    await this.goldRepository.delete(id);
  }

  async getStatistics(period: "daily" | "weekly" | "monthly"): Promise<GoldPriceStat | null> {
    const stats = await this.goldRepository.getStatistics(period);
    if (!stats) return null;
    return {
      ...stats,
      period,
    };
  }

  async count(): Promise<number> {
    return this.goldRepository.count();
  }
}
