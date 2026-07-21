import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IPaymentRepository } from "../interfaces/index.js";
import type {
  PaymentRequestData,
  PaymentRequestWithUser,
  CreatePaymentInput,
  ReviewPaymentInput,
  PaymentFilters,
  PaginatedPaymentRequests,
} from "../types/index.js";

export class PaymentRepository implements IPaymentRepository {
  async findAll(filters: PaymentFilters): Promise<PaginatedPaymentRequests> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.paymentRequest.findMany({
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
      prisma.paymentRequest.count({ where }),
    ]);

    return {
      data: data.map(this.mapPayment),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async findById(id: string): Promise<PaymentRequestWithUser | null> {
    const payment = await prisma.paymentRequest.findUnique({
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
    return payment ? this.mapPayment(payment) : null;
  }

  async create(data: CreatePaymentInput): Promise<PaymentRequestData> {
    const payment = await prisma.paymentRequest.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        currency: data.currency ?? "USD",
        proofPath: data.proofPath ?? null,
      },
    });
    return this.mapPayment({
      ...payment,
      user: { id: "", email: "", firstName: "", lastName: "" },
    });
  }

  async review(id: string, data: ReviewPaymentInput): Promise<PaymentRequestData> {
    const payment = await prisma.paymentRequest.update({
      where: { id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes ?? null,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
      },
    });
    return this.mapPayment({
      ...payment,
      user: { id: "", email: "", firstName: "", lastName: "" },
    });
  }

  async count(): Promise<number> {
    return prisma.paymentRequest.count();
  }

  private buildWhereClause(filters: PaymentFilters): Prisma.PaymentRequestWhereInput {
    const where: Prisma.PaymentRequestWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { type: { contains: filters.search, mode: "insensitive" } },
        { currency: { contains: filters.search, mode: "insensitive" } },
        { status: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private buildOrderBy(filters: PaymentFilters): Prisma.PaymentRequestOrderByWithRelationInput {
    const allowed = ["type", "amount", "currency", "status", "createdAt", "updatedAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "createdAt";
    const sortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapPayment(row: any): PaymentRequestWithUser {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      amount: row.amount.toString(),
      currency: row.currency,
      proofPath: row.proofPath ?? null,
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
