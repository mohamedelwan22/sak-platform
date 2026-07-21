export interface PaymentRequestData {
  id: string;
  userId: string;
  type: string;
  amount: string;
  currency: string;
  proofPath: string | null;
  status: string;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequestWithUser extends PaymentRequestData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreatePaymentInput {
  userId: string;
  type: string;
  amount: string;
  currency?: string;
  proofPath?: string | null;
}

export interface ReviewPaymentInput {
  status: "approved" | "rejected";
  adminNotes?: string;
  reviewedBy: string;
}

export interface PaymentFilters {
  userId?: string;
  type?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedPaymentRequests {
  data: PaymentRequestWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
