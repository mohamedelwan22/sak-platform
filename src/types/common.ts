export type SortOrder = "asc" | "desc";

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface SearchParams extends PaginationParams {
  search?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  iso2: string | null;
  iso3: string | null;
  phoneCode: string | null;
  currency: string | null;
  currencyCode: string | null;
  nationality: string | null;
  flag: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { cities: number };
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  country?: { id: string; name: string; code: string };
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Land {
  id: string;
  projectId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  frozenBalance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  _count?: { transactions: number };
}

export interface Transaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  rejectionReason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  wallet?: Wallet;
  approvedBy?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
}

export interface Investor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: { sessions: number };
}
