import { NotFoundError } from "../../../lib/errors.js";
import type { ProfitDistributionRepository } from "../repositories/profit-distributions.repository.js";
import type {
  ProfitDistributionData,
  ProfitDistributionFilters,
  ProfitDistributionPreview,
  ProfitDistributionWithPayouts,
  PaginatedProfitDistributions,
  PaginatedProfitPayouts,
  ProfitPayoutFilters,
  ProfitPayoutWithUser,
  CreateProfitDistributionInput,
} from "../types/index.js";

export class ProfitDistributionService {
  constructor(private readonly profitDistributionRepository: ProfitDistributionRepository) {}

  async findAll(filters: ProfitDistributionFilters): Promise<PaginatedProfitDistributions> {
    return this.profitDistributionRepository.findAll(filters);
  }

  async findById(id: string): Promise<ProfitDistributionWithPayouts> {
    const distribution = await this.profitDistributionRepository.findById(id);
    if (!distribution) throw new NotFoundError("Profit distribution not found");
    return distribution;
  }

  async create(input: CreateProfitDistributionInput): Promise<ProfitDistributionData> {
    return this.profitDistributionRepository.create(input);
  }

  async count(): Promise<number> {
    return this.profitDistributionRepository.count();
  }

  async findPayouts(filters: ProfitPayoutFilters): Promise<PaginatedProfitPayouts> {
    return this.profitDistributionRepository.findPayouts(filters);
  }

  async findPayoutsByDistributionId(distributionId: string): Promise<ProfitPayoutWithUser[]> {
    return this.profitDistributionRepository.findPayoutsByDistributionId(distributionId);
  }

  async findPayoutsByUserId(userId: string): Promise<ProfitPayoutWithUser[]> {
    return this.profitDistributionRepository.findPayoutsByUserId(userId);
  }

  async getPreview(landId: string, totalProfitUsd: number): Promise<ProfitDistributionPreview> {
    return this.profitDistributionRepository.getPreview(landId, totalProfitUsd);
  }
}
