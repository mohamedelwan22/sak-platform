import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { InternalServerError } from "../../../lib/errors.js";

const SEQUENCE_NAME = "sak_account_number_seq";
const MAX_ACCOUNT_NUMBER = 999_999;

interface NextValueRow {
  nextval: string;
}

export class AccountNumberService {
  constructor(private readonly client: PrismaClient = prisma) {}

  async generateNext(): Promise<string> {
    const rows = (await this.client.$queryRaw<
      NextValueRow[]
    >`SELECT nextval(${SEQUENCE_NAME})::text AS nextval`) as NextValueRow[];

    const raw = rows[0]?.nextval;
    const value = Number(raw);

    if (!Number.isInteger(value) || value < 0) {
      throw new InternalServerError("Failed to generate account number");
    }

    if (value > MAX_ACCOUNT_NUMBER) {
      throw new InternalServerError("Account number range exhausted");
    }

    return `SAK${String(value).padStart(6, "0")}`;
  }
}
