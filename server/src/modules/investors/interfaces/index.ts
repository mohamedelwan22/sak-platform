import type {
  InvestorData,
  InvestorWithRelations,
  CreateInvestorInput,
  UpdateInvestorInput,
  InvestorFilters,
  PaginatedInvestors,
} from "../types/index.js";

export interface IInvestorRepository {
  findAll(filters: InvestorFilters): Promise<PaginatedInvestors>;
  findById(id: string): Promise<InvestorWithRelations | null>;
  findByEmail(email: string): Promise<InvestorData | null>;
  findByPhone(phone: string): Promise<InvestorData | null>;
  create(data: CreateInvestorInput, roleId: string): Promise<InvestorData>;
  update(id: string, data: UpdateInvestorInput): Promise<InvestorData>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  count(): Promise<number>;
}
