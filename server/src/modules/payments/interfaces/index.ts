import type {
  PaymentRequestData,
  PaymentRequestWithUser,
  CreatePaymentInput,
  ReviewPaymentInput,
  PaymentFilters,
  PaginatedPaymentRequests,
} from "../types/index.js";

export interface IPaymentRepository {
  findAll(filters: PaymentFilters): Promise<PaginatedPaymentRequests>;
  findById(id: string): Promise<PaymentRequestWithUser | null>;
  create(data: CreatePaymentInput): Promise<PaymentRequestData>;
  review(id: string, data: ReviewPaymentInput): Promise<PaymentRequestData>;
  count(): Promise<number>;
}
