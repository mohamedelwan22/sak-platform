import type { Prisma } from "@prisma/client";

export interface ProjectData {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  country: string;
  city: string;
  coverImageUrl: string | null;
  gallery: Prisma.JsonValue;
  documents: Prisma.JsonValue;
  status: string;
  riskLevel: string;
  expectedRoi: Prisma.Decimal;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithLands extends ProjectData {
  _count: { lands: number };
}

export interface CreateProjectInput {
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  country: string;
  city?: string;
  coverImageUrl?: string | null;
  gallery?: unknown[];
  documents?: unknown[];
  status?: string;
  riskLevel?: string;
  expectedRoi?: number;
  sortOrder?: number;
}

export interface UpdateProjectInput {
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  country?: string;
  city?: string;
  coverImageUrl?: string | null;
  gallery?: unknown[];
  documents?: unknown[];
  status?: string;
  riskLevel?: string;
  expectedRoi?: number;
  sortOrder?: number;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedProjects {
  data: ProjectWithLands[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
