import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IKycRepository } from "../interfaces/index.js";
import type {
  KycSubmissionData,
  KycSubmissionWithUser,
  CreateKycInput,
  ReviewKycInput,
  KycFilters,
  PaginatedKycSubmissions,
} from "../types/index.js";

export class KycRepository implements IKycRepository {
  async findAll(filters: KycFilters): Promise<PaginatedKycSubmissions> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.kycSubmission.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.kycSubmission.count({ where }),
    ]);

    return {
      data: data.map(this.mapKyc),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<KycSubmissionWithUser | null> {
    const submission = await prisma.kycSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    return submission ? this.mapKyc(submission) : null;
  }

  async findByUserId(userId: string): Promise<KycSubmissionData | null> {
    const submission = await prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return submission
      ? this.mapKyc({ ...submission, user: { id: "", email: "", firstName: "", lastName: "" } })
      : null;
  }

  async create(data: CreateKycInput): Promise<KycSubmissionData> {
    const submission = await prisma.kycSubmission.create({
      data: {
        userId: data.userId,
        documentType: data.documentType,
        frontImagePath: data.frontImagePath ?? null,
        backImagePath: data.backImagePath ?? null,
        selfieImagePath: data.selfieImagePath ?? null,
      },
    });
    return this.mapKyc({
      ...submission,
      user: { id: "", email: "", firstName: "", lastName: "" },
    });
  }

  async review(id: string, data: ReviewKycInput): Promise<KycSubmissionData> {
    const submission = await prisma.kycSubmission.update({
      where: { id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes ?? null,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
      },
    });
    return this.mapKyc({
      ...submission,
      user: { id: "", email: "", firstName: "", lastName: "" },
    });
  }

  async count(): Promise<number> {
    return prisma.kycSubmission.count();
  }

  private buildWhereClause(filters: KycFilters): Prisma.KycSubmissionWhereInput {
    const where: Prisma.KycSubmissionWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.documentType) {
      where.documentType = filters.documentType;
    }

    if (filters.search) {
      where.OR = [
        { documentType: { contains: filters.search, mode: "insensitive" } },
        { status: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: KycFilters): Prisma.KycSubmissionOrderByWithRelationInput {
    const allowed = ["documentType", "status", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapKyc(row: any): KycSubmissionWithUser {
    return {
      id: row.id,
      userId: row.userId,
      documentType: row.documentType,
      frontImagePath: row.frontImagePath ?? null,
      backImagePath: row.backImagePath ?? null,
      selfieImagePath: row.selfieImagePath ?? null,
      status: row.status,
      adminNotes: row.adminNotes ?? null,
      reviewedBy: row.reviewedBy ?? null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: row.user ?? { id: "", email: "", firstName: "", lastName: "" },
    };
  }
}
