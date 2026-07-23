import { prisma } from "../../../lib/prisma.js";
import type { ISakConfigRepository } from "../interfaces/index.js";
import type { SakConfigData, CreateSakConfigInput, UpdateSakConfigInput } from "../types/index.js";

export class SakRepository implements ISakConfigRepository {
  async findAll(): Promise<SakConfigData[]> {
    const records = await prisma.sakConfig.findMany({
      orderBy: { effectiveFrom: "desc" },
    });
    return records.map(this.mapSakConfig);
  }

  async findById(id: string): Promise<SakConfigData | null> {
    const record = await prisma.sakConfig.findUnique({ where: { id } });
    return record ? this.mapSakConfig(record) : null;
  }

  async findCurrent(): Promise<SakConfigData | null> {
    const record = await prisma.sakConfig.findFirst({
      where: {
        effectiveFrom: { lte: new Date() },
      },
      orderBy: { effectiveFrom: "desc" },
    });
    return record ? this.mapSakConfig(record) : null;
  }

  async create(data: CreateSakConfigInput): Promise<SakConfigData> {
    const record = await prisma.sakConfig.create({
      data: {
        sakToGoldRatio: data.sakToGoldRatio,
        sellFeePercent: data.sellFeePercent,
        effectiveFrom: data.effectiveFrom,
      },
    });
    return this.mapSakConfig(record);
  }

  async update(id: string, data: UpdateSakConfigInput): Promise<SakConfigData> {
    const record = await prisma.sakConfig.update({
      where: { id },
      data: {
        ...(data.sakToGoldRatio !== undefined && { sakToGoldRatio: data.sakToGoldRatio }),
        ...(data.sellFeePercent !== undefined && { sellFeePercent: data.sellFeePercent }),
        ...(data.effectiveFrom !== undefined && { effectiveFrom: data.effectiveFrom }),
      },
    });
    return this.mapSakConfig(record);
  }

  async delete(id: string): Promise<void> {
    await prisma.sakConfig.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.sakConfig.count();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapSakConfig(row: any): SakConfigData {
    return {
      id: row.id,
      sakToGoldRatio: Number(row.sakToGoldRatio),
      sellFeePercent: Number(row.sellFeePercent),
      effectiveFrom: row.effectiveFrom,
      createdAt: row.createdAt,
    };
  }
}
