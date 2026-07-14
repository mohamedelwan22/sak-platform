export interface FilterOptions {
  field: string;
  operator:
    "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "in";
  value: unknown;
}

const OPERATOR_PREFIX = "__";

function isOperator(value: string): value is FilterOptions["operator"] {
  return [
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "startsWith",
    "endsWith",
    "in",
  ].includes(value);
}

export function parseFilterParams(
  params: Record<string, unknown>,
  allowedFields: string[],
): FilterOptions[] {
  const filters: FilterOptions[] = [];

  for (const key of Object.keys(params)) {
    if (
      key === "page" ||
      key === "limit" ||
      key === "sortBy" ||
      key === "sortOrder" ||
      key === "search"
    ) {
      continue;
    }

    const value = params[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const operatorSplit = key.split(OPERATOR_PREFIX);
    let field: string;
    let operator: FilterOptions["operator"] = "eq";

    if (operatorSplit.length === 2 && isOperator(operatorSplit[1])) {
      field = operatorSplit[0];
      operator = operatorSplit[1];
    } else {
      field = key;
    }

    if (!allowedFields.includes(field)) {
      continue;
    }

    const parsedValue = operator === "in" ? parseInValue(value) : value;

    filters.push({ field, operator, value: parsedValue });
  }

  return filters;
}

function parseInValue(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  if (Array.isArray(value)) {
    return value.map(String).filter((v) => v.length > 0);
  }

  return [String(value)];
}

export function buildWhereClause(filters: FilterOptions[]): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  for (const filter of filters) {
    where[filter.field] = buildFieldCondition(filter.operator, filter.value);
  }

  return where;
}

function buildFieldCondition(operator: FilterOptions["operator"], value: unknown): unknown {
  switch (operator) {
    case "eq":
      return value;
    case "neq":
      return { not: value };
    case "gt":
      return { gt: value };
    case "gte":
      return { gte: value };
    case "lt":
      return { lt: value };
    case "lte":
      return { lte: value };
    case "contains":
      return { contains: value, mode: "insensitive" };
    case "startsWith":
      return { startsWith: value, mode: "insensitive" };
    case "endsWith":
      return { endsWith: value, mode: "insensitive" };
    case "in":
      return { in: value };
  }
}
