import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import type { ICountryRepository } from "../interfaces/index.js";
import type {
  CountryData,
  CountryWithCities,
  CreateCountryInput,
  UpdateCountryInput,
  CountryFilters,
  PaginatedCountries,
} from "../types/index.js";

export class CountryRepository implements ICountryRepository {
  async findAll(filters: CountryFilters): Promise<PaginatedCountries> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(filters);

    const [data, total] = await Promise.all([
      prisma.country.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { _count: { select: { cities: true } } },
      }),
      prisma.country.count({ where }),
    ]);

    return {
      data: data.map(this.mapCountry),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CountryWithCities | null> {
    const country = await prisma.country.findUnique({
      where: { id },
      include: { _count: { select: { cities: true } } },
    });
    return country ? this.mapCountry(country) : null;
  }

  async findByName(name: string): Promise<CountryData | null> {
    const country = await prisma.country.findUnique({ where: { name } });
    return country ? this.mapCountry(country) : null;
  }

  async findByCode(code: string): Promise<CountryData | null> {
    const country = await prisma.country.findUnique({ where: { code } });
    return country ? this.mapCountry(country) : null;
  }

  async create(data: CreateCountryInput): Promise<CountryData> {
    const country = await prisma.country.create({
      data: {
        name: data.name,
        code: data.code,
        iso2: data.iso2 ?? null,
        iso3: data.iso3 ?? null,
        phoneCode: data.phoneCode ?? null,
        currency: data.currency ?? null,
        currencyCode: data.currencyCode ?? null,
        nationality: data.nationality ?? null,
        flag: data.flag ?? null,
        status: (data.status as "active" | "inactive") ?? "active",
      },
    });
    return this.mapCountry(country);
  }

  async update(id: string, data: UpdateCountryInput): Promise<CountryData> {
    const country = await prisma.country.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.iso2 !== undefined && { iso2: data.iso2 }),
        ...(data.iso3 !== undefined && { iso3: data.iso3 }),
        ...(data.phoneCode !== undefined && { phoneCode: data.phoneCode }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.currencyCode !== undefined && { currencyCode: data.currencyCode }),
        ...(data.nationality !== undefined && { nationality: data.nationality }),
        ...(data.flag !== undefined && { flag: data.flag }),
        ...(data.status !== undefined && {
          status: data.status as "active" | "inactive",
        }),
      },
    });
    return this.mapCountry(country);
  }

  async delete(id: string): Promise<void> {
    await prisma.country.delete({ where: { id } });
  }

  async count(): Promise<number> {
    return prisma.country.count({ where: { deletedAt: null } });
  }

  private buildWhereClause(filters: CountryFilters): Prisma.CountryWhereInput {
    const where: Prisma.CountryWhereInput = { deletedAt: null };
    if (filters.status) {
      where.status = filters.status as "active" | "inactive";
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { iso2: { contains: filters.search, mode: "insensitive" } },
        { iso3: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return where;
  }

  private buildOrderBy(filters: CountryFilters): Prisma.CountryOrderByWithRelationInput {
    const allowed = ["name", "code", "status", "createdAt"];
    const sortBy = filters.sortBy && allowed.includes(filters.sortBy) ? filters.sortBy : "name";
    const sortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return { [sortBy]: sortOrder };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapCountry(row: any): CountryWithCities {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      iso2: row.iso2 ?? null,
      iso3: row.iso3 ?? null,
      phoneCode: row.phoneCode ?? null,
      currency: row.currency ?? null,
      currencyCode: row.currencyCode ?? null,
      nationality: row.nationality ?? null,
      flag: row.flag ?? null,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: row._count ?? { cities: 0 },
    };
  }
}
