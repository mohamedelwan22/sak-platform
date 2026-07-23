import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { SakRepository } from "../repositories/sak.repository.js";
import type { SakConfigData, CreateSakConfigInput, UpdateSakConfigInput } from "../types/index.js";

export class SakService {
  constructor(private readonly sakRepository: SakRepository) {}

  async findAll(): Promise<SakConfigData[]> {
    return this.sakRepository.findAll();
  }

  async findById(id: string): Promise<SakConfigData> {
    const config = await this.sakRepository.findById(id);
    if (!config) throw new NotFoundError("SAK config not found");
    return config;
  }

  async findCurrent(): Promise<SakConfigData | null> {
    return this.sakRepository.findCurrent();
  }

  async create(input: CreateSakConfigInput): Promise<SakConfigData> {
    if (input.sakToGoldRatio <= 0) {
      throw new NotFoundError("SAK-to-gold ratio must be greater than 0");
    }
    if (input.sellFeePercent < 0 || input.sellFeePercent > 100) {
      throw new NotFoundError("Sell fee percent must be between 0 and 100");
    }
    return this.sakRepository.create(input);
  }

  async update(id: string, input: UpdateSakConfigInput): Promise<SakConfigData> {
    const existing = await this.sakRepository.findById(id);
    if (!existing) throw new NotFoundError("SAK config not found");

    if (input.sakToGoldRatio !== undefined && input.sakToGoldRatio <= 0) {
      throw new NotFoundError("SAK-to-gold ratio must be greater than 0");
    }
    if (
      input.sellFeePercent !== undefined &&
      (input.sellFeePercent < 0 || input.sellFeePercent > 100)
    ) {
      throw new NotFoundError("Sell fee percent must be between 0 and 100");
    }

    return this.sakRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.sakRepository.findById(id);
    if (!existing) throw new NotFoundError("SAK config not found");

    const count = await this.sakRepository.count();
    if (count <= 1) {
      throw new ConflictError("Cannot delete the only SAK configuration");
    }

    await this.sakRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.sakRepository.count();
  }
}
