import bcrypt from "bcrypt";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import type { InvestorRepository } from "../repositories/investors.repository.js";
import type {
  InvestorData,
  InvestorWithRelations,
  CreateInvestorInput,
  UpdateInvestorInput,
  InvestorFilters,
  PaginatedInvestors,
} from "../types/index.js";
import { INVESTOR_ROLE_NAME } from "../constants/index.js";

const SALT_ROUNDS = 12;

export class InvestorService {
  constructor(private readonly investorRepository: InvestorRepository) {}

  async findAll(filters: InvestorFilters): Promise<PaginatedInvestors> {
    return this.investorRepository.findAll(filters);
  }

  async findById(id: string): Promise<InvestorWithRelations> {
    const investor = await this.investorRepository.findById(id);
    if (!investor) throw new NotFoundError("Investor not found");
    return investor;
  }

  async create(input: CreateInvestorInput): Promise<InvestorData> {
    const existingEmail = await this.investorRepository.findByEmail(input.email);
    if (existingEmail) throw new ConflictError("An investor with this email already exists");

    if (input.phone) {
      const existingPhone = await this.investorRepository.findByPhone(input.phone);
      if (existingPhone)
        throw new ConflictError("An investor with this phone number already exists");
    }

    const role = await prisma.role.findUnique({ where: { name: INVESTOR_ROLE_NAME } });
    if (!role) throw new NotFoundError("Investor role not found");

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    return this.investorRepository.create({ ...input, password: passwordHash }, role.id);
  }

  async update(id: string, input: UpdateInvestorInput): Promise<InvestorData> {
    const existing = await this.investorRepository.findById(id);
    if (!existing) throw new NotFoundError("Investor not found");

    if (input.email && input.email !== existing.email) {
      const emailTaken = await this.investorRepository.findByEmail(input.email);
      if (emailTaken) throw new ConflictError("An investor with this email already exists");
    }

    if (input.phone && input.phone !== existing.phone) {
      const phoneTaken = await this.investorRepository.findByPhone(input.phone);
      if (phoneTaken) throw new ConflictError("An investor with this phone number already exists");
    }

    return this.investorRepository.update(id, input);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.investorRepository.findById(id);
    if (!existing) throw new NotFoundError("Investor not found");
    await this.investorRepository.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    const existing = await this.investorRepository.findById(id);
    if (!existing) throw new NotFoundError("Investor not found");
    if (!existing.deletedAt) throw new ConflictError("Investor is not deleted");
    await this.investorRepository.restore(id);
  }

  async count(): Promise<number> {
    return this.investorRepository.count();
  }
}
