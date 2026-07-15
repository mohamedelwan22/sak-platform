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
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}
