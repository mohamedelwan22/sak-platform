import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import { goldPriceService } from "../../../services/gold-price.service.js";
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
    const prices = [input.pricePerOunce, input.pricePerGram, input.gramPriceUsd];
    if (!prices.some((p) => p !== undefined && p > 0)) {
      throw new ValidationError("At least one positive price is required");
    }
    for (const p of prices) {
      if (p !== undefined && (typeof p !== "number" || !Number.isFinite(p) || p <= 0)) {
        throw new ValidationError("Prices must be positive numbers");
      }
    }
    const price = await this.goldRepository.create(input);
    // Manual entries take effect immediately for market pricing.
    goldPriceService.invalidateCache();
    return price;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.goldRepository.findById(id);
    if (!existing) throw new NotFoundError("Gold price not found");
    await this.goldRepository.delete(id);
    goldPriceService.invalidateCache();
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
