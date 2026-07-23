import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { HoldingRepository } from "../repositories/holdings.repository.js";
import type {
  HoldingData,
  HoldingWithRelations,
  CreateHoldingInput,
  UpdateHoldingInput,
  HoldingFilters,
  PaginatedHoldings,
  PortfolioSummary,
} from "../types/index.js";

export class HoldingService {
  constructor(private readonly holdingRepository: HoldingRepository) {}

  async findAll(filters: HoldingFilters): Promise<PaginatedHoldings> {
    return this.holdingRepository.findAll(filters);
  }

  async findById(id: string): Promise<HoldingWithRelations> {
    const holding = await this.holdingRepository.findById(id);
    if (!holding) throw new NotFoundError("Holding not found");
    return holding;
  }

  async findByUserId(userId: string): Promise<HoldingWithRelations[]> {
    return this.holdingRepository.findByUserId(userId);
  }

  async create(input: CreateHoldingInput): Promise<HoldingData> {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundError("User not found");

    const land = await prisma.land.findUnique({ where: { id: input.landId } });
    if (!land) throw new NotFoundError("Land not found");

    if (Number(land.availableSak) < input.sakOwned) {
      throw new ConflictError(
        `Insufficient SAK available. Requested: ${input.sakOwned}, Available: ${land.availableSak}`,
      );
    }

    const latestGoldPrice = await prisma.goldPriceHistory.findFirst({
      orderBy: { createdAt: "desc" },
    });
    const latestSakConfig = await prisma.sakConfig.findFirst({
      orderBy: { effectiveFrom: "desc" },
    });

    let pricePerSak = input.purchasePricePerSakUsd;
    if (!input.purchasePricePerSakUsd && latestGoldPrice && latestSakConfig) {
      pricePerSak =
        Number(latestGoldPrice.gramPriceUsd) *
        Number(latestSakConfig.sakToGoldRatio);
    }

    const holding = await prisma.$transaction(async (tx) => {
      const h = await tx.holding.create({
        data: {
          userId: input.userId,
          landId: input.landId,
          sakOwned: input.sakOwned,
          purchasePricePerSakUsd: pricePerSak,
          maturityDate: input.maturityDate,
          status: (input.status as "active" | "matured" | "sold" | "closed") ?? "active",
        },
      });

      await tx.land.update({
        where: { id: input.landId },
        data: {
          availableSak: {
            decrement: input.sakOwned,
          },
        },
      });

      return h;
    });

    return {
      id: holding.id,
      userId: holding.userId,
      landId: holding.landId,
      sakOwned: Number(holding.sakOwned),
      purchasePricePerSakUsd: Number(holding.purchasePricePerSakUsd),
      purchaseDate: holding.purchaseDate,
      maturityDate: holding.maturityDate,
      status: holding.status,
      createdAt: holding.createdAt,
      updatedAt: holding.updatedAt,
    };
  }

  async update(id: string, input: UpdateHoldingInput): Promise<HoldingData> {
    const existing = await this.holdingRepository.findById(id);
    if (!existing) throw new NotFoundError("Holding not found");

    return this.holdingRepository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.holdingRepository.findById(id);
    if (!existing) throw new NotFoundError("Holding not found");

    await this.holdingRepository.delete(id);
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    return this.holdingRepository.getPortfolioSummary(userId);
  }
}
