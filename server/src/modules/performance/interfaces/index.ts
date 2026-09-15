import { Prisma } from "@prisma/client";

export interface PerformanceHolding {
  id: string;
  landId: string;
  landTitleAr: string | null;
  projectTitleAr: string | null;
  sakOwned: Prisma.Decimal;
  purchasePricePerSakUsd: Prisma.Decimal;
  status: "active" | "matured" | "sold" | "closed";
  createdAt: Date;
}

export interface PerformanceHoldingEvent {
  at: Date;
  delta: Prisma.Decimal;
}

export interface PerformancePayout {
  id: string;
  distributionId: string;
  holdingId: string | null;
  landTitleAr: string | null;
  periodStart: Date;
  periodEnd: Date;
  payoutUsd: Prisma.Decimal;
  payoutSak: Prisma.Decimal;
  ownershipPercent: Prisma.Decimal;
  status: string;
  createdAt: Date;
}

export interface IPerformanceRepository {
  findHoldingsByUser(userId: string): Promise<PerformanceHolding[]>;
  findHoldingEventsByUser(userId: string): Promise<PerformanceHoldingEvent[]>;
  findGoldHistory(): Promise<Array<{ id: string; gramPriceUsd: Prisma.Decimal; createdAt: Date }>>;
  findSakConfigs(): Promise<Array<{ sakToGoldRatio: Prisma.Decimal; effectiveFrom: Date }>>;
  findPayoutsByUser(userId: string): Promise<PerformancePayout[]>;
}