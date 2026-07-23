import type {
  HoldingData,
  HoldingWithRelations,
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilters,
  PaginatedHoldings,
  PortfolioSummary,
} from "../types/index.js";

export interface IHoldingRepository {
  findAll(filters: HoldingFilters): Promise<PaginatedHoldings>;
  findById(id: string): Promise<HoldingWithRelations | null>;
  findByUserId(userId: string): Promise<HoldingWithRelations[]>;
  create(data: CreateHoldingInput): Promise<HoldingData>;
  update(id: string, data: UpdateHoldingInput): Promise<HoldingData>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  getPortfolioSummary(userId: string): Promise<PortfolioSummary>;
}
