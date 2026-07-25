import type {
  CertificateData,
  CertificateFilters,
  CreateCertificateInput,
  PaginatedCertificates,
  CertificateWithHolding,
} from "../types/index.js";
import type { ICertificateRepository } from "../interfaces/index.js";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { CERTIFICATE_SORTABLE_FIELDS } from "../constants/index.js";

const certificateSelect = {
  id: true,
  userId: true,
  holdingId: true,
  filePath: true,
  generatedAt: true,
  createdAt: true,
  holding: {
    select: {
      id: true,
      sakOwned: true,
      purchasePricePerSakUsd: true,
      purchaseDate: true,
      maturityDate: true,
      land: {
        select: {
          id: true,
          titleEn: true,
          titleAr: true,
          country: true,
          city: true,
          assetType: true,
        },
      },
    },
  },
} satisfies Prisma.CertificateSelect;

type CertificateRow = Prisma.CertificateGetPayload<{
  select: typeof certificateSelect;
}>;

export class CertificateRepository implements ICertificateRepository {
  async findAll(filters: CertificateFilters): Promise<PaginatedCertificates> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: certificateSelect,
      }),
      prisma.certificate.count({ where }),
    ]);

    return {
      data: data.map(this.mapCertificate),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<CertificateWithHolding | null> {
    const row = await prisma.certificate.findUnique({
      where: { id },
      select: certificateSelect,
    });
    if (!row) return null;
    return this.mapCertificate(row);
  }

  async findByUserIdAndHoldingId(
    userId: string,
    holdingId: string,
  ): Promise<CertificateData | null> {
    const row = await prisma.certificate.findFirst({
      where: { userId, holdingId },
      select: {
        id: true,
        userId: true,
        holdingId: true,
        filePath: true,
        generatedAt: true,
        createdAt: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      holdingId: row.holdingId,
      filePath: row.filePath,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
    };
  }

  async create(data: CreateCertificateInput): Promise<CertificateData> {
    const created = await prisma.certificate.create({
      data: {
        userId: data.userId,
        holdingId: data.holdingId,
        filePath: data.filePath,
      },
      select: {
        id: true,
        userId: true,
        holdingId: true,
        filePath: true,
        generatedAt: true,
        createdAt: true,
      },
    });
    return {
      id: created.id,
      userId: created.userId,
      holdingId: created.holdingId,
      filePath: created.filePath,
      generatedAt: created.generatedAt,
      createdAt: created.createdAt,
    };
  }

  async count(): Promise<number> {
    return prisma.certificate.count();
  }

  private buildWhereClause(filters: CertificateFilters): Prisma.CertificateWhereInput {
    const where: Prisma.CertificateWhereInput = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.holdingId) where.holdingId = filters.holdingId;
    return where;
  }

  private buildOrderBy(filters: CertificateFilters): Prisma.CertificateOrderByWithRelationInput {
    const field = CERTIFICATE_SORTABLE_FIELDS.includes(
      filters.sortBy as (typeof CERTIFICATE_SORTABLE_FIELDS)[number],
    )
      ? filters.sortBy!
      : "generatedAt";
    return { [field]: filters.sortOrder ?? "desc" };
  }

  private mapCertificate(row: CertificateRow): CertificateWithHolding {
    return {
      id: row.id,
      userId: row.userId,
      holdingId: row.holdingId,
      filePath: row.filePath,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
      holding: {
        id: row.holding.id,
        sakOwned: Number(row.holding.sakOwned),
        purchasePricePerSakUsd: Number(row.holding.purchasePricePerSakUsd),
        purchaseDate: row.holding.purchaseDate,
        maturityDate: row.holding.maturityDate,
        land: {
          id: row.holding.land.id,
          titleEn: row.holding.land.titleEn,
          titleAr: row.holding.land.titleAr,
          country: row.holding.land.country,
          city: row.holding.land.city,
          assetType: row.holding.land.assetType,
        },
      },
    };
  }
}
