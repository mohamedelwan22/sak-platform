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

export interface IProfitDistributionRepository {
  findAll(filters: ProfitDistributionFilters): Promise<PaginatedProfitDistributions>;
  findById(id: string): Promise<ProfitDistributionWithPayouts | null>;
  create(data: CreateProfitDistributionInput): Promise<ProfitDistributionData>;
  count(): Promise<number>;
  findPayouts(filters: ProfitPayoutFilters): Promise<PaginatedProfitPayouts>;
  findPayoutsByDistributionId(distributionId: string): Promise<ProfitPayoutWithUser[]>;
  findPayoutsByUserId(userId: string): Promise<ProfitPayoutWithUser[]>;
  getPreview(landId: string, totalProfitUsd: number): Promise<ProfitDistributionPreview>;
}
