export interface KycSubmissionData {
  id: string;
  userId: string;
  documentType: string;
  frontImagePath: string | null;
  backImagePath: string | null;
  selfieImagePath: string | null;
  status: string;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KycSubmissionWithUser extends KycSubmissionData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateKycInput {
  userId: string;
  documentType: string;
  frontImagePath?: string | null;
  backImagePath?: string | null;
  selfieImagePath?: string | null;
}

export interface ReviewKycInput {
  status: "approved" | "rejected";
  adminNotes?: string;
  reviewedBy: string;
}

export interface KycFilters {
  userId?: string;
  status?: string;
  documentType?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedKycSubmissions {
  data: KycSubmissionWithUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
