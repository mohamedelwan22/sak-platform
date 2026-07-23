import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { IProjectRepository } from "../interfaces/index.js";
import type {
  ProjectData,
  ProjectWithLands,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  PaginatedProjects,
} from "../types/index.js";

export class ProjectRepository implements IProjectRepository {
  async findAll(filters: ProjectFilters): Promise<PaginatedProjects> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { lands: true } } },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data: data.map(this.mapProject),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ProjectWithLands | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { lands: true } } },
    });
    return project ? this.mapProject(project) : null;
  }

  async findByName(name: string): Promise<ProjectData | null> {
    const project = await prisma.project.findFirst({
      where: { titleAr: name },
    });
    return project ? this.mapProject(project) : null;
  }

  async create(data: CreateProjectInput): Promise<ProjectData> {
    const project = await prisma.project.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        descriptionEn: data.descriptionEn ?? "",
        descriptionAr: data.descriptionAr ?? "",
        country: data.country,
        city: data.city ?? "",
        coverImageUrl: data.coverImageUrl ?? null,
        gallery: (data.gallery ?? []) as Prisma.InputJsonValue,
        documents: (data.documents ?? []) as Prisma.InputJsonValue,
        status: (data.status as "active" | "inactive" | "completed" | "archived") ?? "active",
        riskLevel: (data.riskLevel as "low" | "medium" | "high") ?? "low",
        expectedRoi: data.expectedRoi ?? 0,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    return this.mapProject(project);
  }

  async update(id: string, data: UpdateProjectInput): Promise<ProjectData> {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
        ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
        ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn }),
        ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(data.gallery !== undefined && { gallery: data.gallery as Prisma.InputJsonValue }),
        ...(data.documents !== undefined && { documents: data.documents as Prisma.InputJsonValue }),
        ...(data.status !== undefined && {
          status: data.status as "active" | "inactive" | "completed" | "archived",
        }),
        ...(data.riskLevel !== undefined && {
          riskLevel: data.riskLevel as "low" | "medium" | "high",
        }),
        ...(data.expectedRoi !== undefined && { expectedRoi: data.expectedRoi }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
    return this.mapProject(project);
  }

  async delete(id: string): Promise<void> {
    await prisma.project.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.project.count();
  }

  private buildWhereClause(filters: ProjectFilters): Prisma.ProjectWhereInput {
    const where: Prisma.ProjectWhereInput = {};
    if (filters.status) {
      where.status = filters.status as "active" | "inactive" | "completed" | "archived";
    }
    if (filters.search) {
      where.OR = [
        { titleAr: { contains: filters.search, mode: "insensitive" } },
        { titleEn: { contains: filters.search, mode: "insensitive" } },
        { country: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  private buildOrderBy(
    filters: ProjectFilters,
  ): Prisma.ProjectOrderByWithRelationInput {
    const allowed = ["titleAr", "titleEn", "country", "status", "sortOrder", "createdAt"];
    const sortBy =
      filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "sortOrder";
    const sortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapProject(row: any): ProjectWithLands {
    return {
      id: row.id,
      titleEn: row.titleEn,
      titleAr: row.titleAr,
      descriptionEn: row.descriptionEn ?? "",
      descriptionAr: row.descriptionAr ?? "",
      country: row.country,
      city: row.city ?? "",
      coverImageUrl: row.coverImageUrl ?? null,
      gallery: row.gallery as Prisma.JsonValue,
      documents: row.documents as Prisma.JsonValue,
      status: row.status,
      riskLevel: row.riskLevel,
      expectedRoi: row.expectedRoi,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: row._count ?? { lands: 0 },
    };
  }
}
