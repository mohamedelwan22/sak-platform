import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { ICityRepository } from "../interfaces/index.js";
import type {
  CityData,
  CityWithCountry,
  CreateCityInput,
  UpdateCityInput,
  CityFilters,
  PaginatedCities,
} from "../types/index.js";

export class CityRepository implements ICityRepository {
  async findAll(filters: CityFilters): Promise<PaginatedCities> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.city.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { country: { select: { id: true, name: true, code: true } } },
      }),
      prisma.city.count({ where }),
    ]);

    return {
      data: data.map(this.mapCity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CityWithCountry | null> {
    const city = await prisma.city.findUnique({
      where: { id },
      include: { country: { select: { id: true, name: true, code: true } } },
    });
    return city ? this.mapCity(city) : null;
  }

  async findByNameAndCountry(name: string, countryId: string): Promise<CityData | null> {
    const city = await prisma.city.findFirst({
      where: { name, countryId, deletedAt: null },
    });
    return city ? this.mapCity({ ...city, country: { id: "", name: "", code: "" } }) : null;
  }

  async create(data: CreateCityInput): Promise<CityData> {
    const city = await prisma.city.create({
      data: {
        name: data.name,
        countryId: data.countryId,
        isActive: data.isActive ?? true,
      },
      include: { country: { select: { id: true, name: true, code: true } } },
    });
    return this.mapCity(city);
  }

  async update(id: string, data: UpdateCityInput): Promise<CityData> {
    const city = await prisma.city.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.countryId !== undefined && { countryId: data.countryId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { country: { select: { id: true, name: true, code: true } } },
    });
    return this.mapCity(city);
  }

  async delete(id: string): Promise<void> {
    await prisma.city.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.city.count({ where: { deletedAt: null } });
  }

  private buildWhereClause(filters: CityFilters): Prisma.CityWhereInput {
    const where: Prisma.CityWhereInput = { deletedAt: null };
    if (filters.countryId) {
      where.countryId = filters.countryId;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { country: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }
    return where;
  }

  private buildOrderBy(filters: CityFilters): Prisma.CityOrderByWithRelationInput {
    const allowed = ["name", "isActive", "createdAt"];
    const sortBy = filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "name";
    const sortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCity(row: any): CityWithCountry {
    return {
      id: row.id,
      countryId: row.countryId,
      name: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      country: row.country,
    };
  }
}
