import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";

export class CMSService {
  /**
   * Create asset type
   */
  async createAssetType(
    userId: string,
    data: {
      slug: string;
      nameEn: string;
      nameAr: string;
      descriptionEn?: string;
      descriptionAr?: string;
      sortOrder?: number;
    },
  ): Promise<any> {
    // Check slug is unique
    const existing = await prisma.assetType.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new ValidationError("Asset type with this slug already exists");
    }

    const assetType = await prisma.assetType.create({
      data: {
        slug: data.slug,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        sortOrder: data.sortOrder ?? 0,
        createdBy: userId,
        isSystem: false,
        isActive: true,
      },
    });

    return this.formatAssetType(assetType);
  }

  /**
   * Add field to asset type
   */
  async addAssetField(
    assetTypeId: string,
    data: {
      fieldKey: string;
      labelEn: string;
      labelAr: string;
      fieldType: string;
      isRequired?: boolean;
      isSearchable?: boolean;
      isFilterable?: boolean;
      isPublic?: boolean;
      options?: any[];
      sortOrder?: number;
    },
  ): Promise<any> {
    const assetType = await prisma.assetType.findUnique({
      where: { id: assetTypeId },
    });

    if (!assetType) {
      throw new NotFoundError("Asset type not found");
    }

    if (assetType.isSystem) {
      throw new ValidationError("Cannot modify system asset types");
    }

    const field = await prisma.assetFieldDefinition.create({
      data: {
        assetTypeId,
        fieldKey: data.fieldKey,
        labelEn: data.labelEn,
        labelAr: data.labelAr,
        fieldType: data.fieldType,
        isRequired: data.isRequired ?? false,
        isSearchable: data.isSearchable ?? false,
        isFilterable: data.isFilterable ?? false,
        isPublic: data.isPublic ?? true,
        options: data.options,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return this.formatAssetField(field);
  }

  /**
   * Get asset type with fields. Accepts either an ID (UUID) or a slug string.
   */
  async getAssetType(assetTypeIdOrSlug: string): Promise<any> {
    let assetType = await prisma.assetType.findUnique({
      where: { id: assetTypeIdOrSlug },
      include: {
        fieldDefs: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!assetType) {
      assetType = await prisma.assetType.findUnique({
        where: { slug: assetTypeIdOrSlug },
        include: {
          fieldDefs: { orderBy: { sortOrder: "asc" } },
        },
      });
    }

    if (!assetType) {
      throw new NotFoundError("Asset type not found");
    }

    return {
      ...this.formatAssetType(assetType),
      fields: assetType.fieldDefs.map((f) => this.formatAssetField(f)),
    };
  }

  /**
   * Get all asset types
   */
  async getAssetTypes(
    filters: { isActive?: boolean; page?: number; limit?: number } = {},
  ): Promise<any> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [total, assetTypes] = await Promise.all([
      prisma.assetType.count({ where }),
      prisma.assetType.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { fieldDefs: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);

    return {
      data: assetTypes.map((at) => ({
        ...this.formatAssetType(at),
        fieldCount: at.fieldDefs.length,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update homepage config
   */
  async updateHomepageConfig(userId: string, data: any): Promise<any> {
    let config = await prisma.homepageConfig.findFirst();

    if (!config) {
      config = await prisma.homepageConfig.create({
        data: {
          ...data,
          updatedBy: userId,
        },
      });
    } else {
      config = await prisma.homepageConfig.update({
        where: { id: config.id },
        data: {
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });
    }

    return config;
  }

  /**
   * Get homepage config
   */
  async getHomepageConfig(): Promise<any> {
    let config = await prisma.homepageConfig.findFirst();

    if (!config) {
      config = await prisma.homepageConfig.create({
        data: {
          heroTitleEn: "Welcome to SAK100",
          heroTitleAr: "مرحبا بك في سك 100",
          heroSubtitleEn: "Invest in Real Estate",
          heroSubtitleAr: "استثمر في العقارات",
          heroDescEn: "Fractional real estate investment backed by gold",
          heroDescAr: "استثمار عقاري كسري مدعوم بالذهب",
          heroCtaUrl: "/projects",
          sections: [],
        },
      });
    }

    return config;
  }

  /**
   * Persist validated dynamic field values for a land/asset.
   * Values are validated against the field definitions of the asset type.
   */
  async setAssetFieldValues(
    landId: string,
    values: Record<string, unknown>,
  ): Promise<{ landId: string; values: any[] }> {
    const land = await prisma.land.findUnique({
      where: { id: landId },
      select: { id: true, assetType: true },
    });
    if (!land) {
      throw new NotFoundError("Asset not found");
    }

    const type = await prisma.assetType.findUnique({
      where: { slug: land.assetType },
      include: { fieldDefs: true },
    });
    if (!type || type.fieldDefs.length === 0) {
      throw new ValidationError("No field definitions exist for this asset type");
    }

    const defByKey = new Map(type.fieldDefs.map((f) => [f.fieldKey, f]));
    const providedKeys = Object.keys(values);

    // Reject unknown fields and validate required fields present.
    for (const key of providedKeys) {
      if (!defByKey.has(key)) {
        throw new ValidationError(`Unknown field: ${key}`);
      }
    }
    for (const def of type.fieldDefs) {
      if (def.isRequired && !(def.fieldKey in values)) {
        throw new ValidationError(`Required field missing: ${def.fieldKey}`);
      }
      if (
        !(def.fieldKey in values) ||
        values[def.fieldKey] === null ||
        values[def.fieldKey] === undefined
      ) {
        continue;
      }
      this.validateFieldValue(def, values[def.fieldKey]);
    }

    // Persist values (upsert per land+fieldDef).
    const saved = [];
    for (const def of type.fieldDefs) {
      const raw = values[def.fieldKey];
      if (raw === undefined || raw === null) continue;

      const data: any = {};
      if (def.fieldType === "number" || def.fieldType === "decimal") {
        data.valueNumber = Number(raw);
        data.valueText = null;
        data.valueJson = null;
      } else if (
        def.fieldType === "boolean" ||
        def.fieldType === "select" ||
        def.fieldType === "multi_select" ||
        def.fieldType === "date"
      ) {
        data.valueJson = raw;
        data.valueText = null;
        data.valueNumber = null;
      } else {
        data.valueText = String(raw);
        data.valueJson = null;
        data.valueNumber = null;
      }

      await prisma.assetFieldValue.upsert({
        where: { landId_fieldDefId: { landId, fieldDefId: def.id } },
        update: data,
        create: { landId, fieldDefId: def.id, ...data },
      });
      saved.push({ fieldKey: def.fieldKey, value: raw });
    }

    return { landId, values: saved };
  }

  /**
   * Read dynamic field values for a land/asset, joined with field metadata.
   */
  async getAssetFieldValues(landId: string, opts: { publicOnly?: boolean } = {}): Promise<any[]> {
    const land = await prisma.land.findUnique({
      where: { id: landId },
      select: { assetType: true },
    });
    if (!land) throw new NotFoundError("Asset not found");

    const type = await prisma.assetType.findUnique({
      where: { slug: land.assetType },
      include: {
        fieldDefs: {
          where: opts.publicOnly ? { isPublic: true } : undefined,
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!type) return [];

    const fieldDefIds = type.fieldDefs.map((f) => f.id);
    const valueRows = await prisma.assetFieldValue.findMany({
      where: { fieldDefId: { in: fieldDefIds } },
    });
    const valueByDef = new Map(valueRows.map((v) => [v.fieldDefId, v]));

    return type.fieldDefs.map((def) => {
      const row = valueByDef.get(def.id);
      let value: unknown = null;
      if (row) {
        if (row.valueText !== null) value = row.valueText;
        else if (row.valueNumber !== null)
          value = row.valueNumber.toNumber ? row.valueNumber.toNumber() : row.valueNumber;
        else if (row.valueJson !== null) value = row.valueJson;
      }
      return {
        fieldKey: def.fieldKey,
        labelEn: def.labelEn,
        labelAr: def.labelAr,
        fieldType: def.fieldType,
        isRequired: def.isRequired,
        options: def.options,
        value,
      };
    });
  }

  private validateFieldValue(def: any, raw: unknown): void {
    switch (def.fieldType) {
      case "number":
      case "decimal": {
        const num = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(num)) {
          throw new ValidationError(`Field ${def.fieldKey} must be a valid number`);
        }
        const rules = (def.validationRules as any) ?? null;
        if (rules && typeof rules.max === "number" && num > rules.max) {
          throw new ValidationError(`Field ${def.fieldKey} exceeds maximum ${rules.max}`);
        }
        if (rules && typeof rules.min === "number" && num < rules.min) {
          throw new ValidationError(`Field ${def.fieldKey} is below minimum ${rules.min}`);
        }
        break;
      }
      case "boolean": {
        if (
          typeof raw !== "boolean" &&
          raw !== "true" &&
          raw !== "false" &&
          raw !== 0 &&
          raw !== 1
        ) {
          throw new ValidationError(`Field ${def.fieldKey} must be a boolean`);
        }
        break;
      }
      case "date": {
        const d = new Date(String(raw));
        if (Number.isNaN(d.getTime())) {
          throw new ValidationError(`Field ${def.fieldKey} must be a valid date`);
        }
        break;
      }
      case "select": {
        const options = (def.options as any[]) ?? [];
        if (options.length > 0 && !options.some((o) => o.value === raw)) {
          throw new ValidationError(`Field ${def.fieldKey} has an invalid selection`);
        }
        break;
      }
      case "multi_select": {
        if (
          !Array.isArray(raw) ||
          raw.some((item) => !((def.options as any[]) ?? []).some((o) => o.value === item))
        ) {
          throw new ValidationError(`Field ${def.fieldKey} has invalid selections`);
        }
        break;
      }
      default: {
        if (typeof raw !== "string") {
          throw new ValidationError(`Field ${def.fieldKey} must be a string`);
        }
      }
    }
  }

  private formatAssetType(assetType: any) {
    return {
      id: assetType.id,
      slug: assetType.slug,
      nameEn: assetType.nameEn,
      nameAr: assetType.nameAr,
      descriptionEn: assetType.descriptionEn,
      descriptionAr: assetType.descriptionAr,
      isSystem: assetType.isSystem,
      isActive: assetType.isActive,
      sortOrder: assetType.sortOrder,
      createdAt: assetType.createdAt,
    };
  }

  private formatAssetField(field: any) {
    return {
      id: field.id,
      fieldKey: field.fieldKey,
      labelEn: field.labelEn,
      labelAr: field.labelAr,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      isSearchable: field.isSearchable,
      isFilterable: field.isFilterable,
      isPublic: field.isPublic,
      options: field.options,
      sortOrder: field.sortOrder,
    };
  }
}

export const cmsService = new CMSService();
