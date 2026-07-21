import { NotFoundError, ConflictError } from "../../../lib/errors.js";
import type { PaymentRepository } from "../repositories/payments.repository.js";
import type {
  PaymentRequestData,
  PaymentRequestWithUser,
  CreatePaymentInput,
  ReviewPaymentInput,
  PaymentFilters,
  PaginatedPaymentRequests,
} from "../types/index.js";

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async findAll(filters: PaymentFilters): Promise<PaginatedPaymentRequests> {
    return this.paymentRepository.findAll(filters);
  }

  async findById(id: string): Promise<PaymentRequestWithUser> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) throw new NotFoundError("Payment request not found");
    return payment;
  }

  async create(input: CreatePaymentInput): Promise<PaymentRequestData> {
    return this.paymentRepository.create(input);
  }

  async approve(id: string, reviewerId: string): Promise<PaymentRequestData> {
    const existing = await this.paymentRepository.findById(id);
    if (!existing) throw new NotFoundError("Payment request not found");
    if (existing.status === "approved") throw new ConflictError("Payment request already approved");

    return this.paymentRepository.review(id, {
      status: "approved",
      reviewedBy: reviewerId,
    });
  }

  async reject(id: string, input: ReviewPaymentInput): Promise<PaymentRequestData> {
    const existing = await this.paymentRepository.findById(id);
    if (!existing) throw new NotFoundError("Payment request not found");
    if (existing.status === "rejected") throw new ConflictError("Payment request already rejected");

    return this.paymentRepository.review(id, {
      status: "rejected",
      adminNotes: input.adminNotes,
      reviewedBy: input.reviewedBy,
    });
  }

  async count(): Promise<number> {
    return this.paymentRepository.count();
  }
}
