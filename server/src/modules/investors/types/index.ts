export interface InvestorData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvestorWithRelations extends InvestorData {
  _count: {
    sessions: number;
  };
}

export interface CreateInvestorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status?: string;
}

export interface UpdateInvestorInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  status?: string;
}

export interface InvestorFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedInvestors {
  data: InvestorWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
