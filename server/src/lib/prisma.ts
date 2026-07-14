import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "../config/env.js";
import { logger } from "./logger.js";

const prismaLogger = logger.child({ context: "prisma" });

function createPrismaClient(): PrismaClient {
  const env = getEnv();

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on("error", (err) => {
    prismaLogger.error("Unexpected database pool error:", err);
  });

  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
    ],
  });

  if (env.NODE_ENV === "development") {
    client.$on("query", (e) => {
      prismaLogger.debug("Query", {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    prismaLogger.info("Database connected successfully");
  } catch (error) {
    prismaLogger.error("Database connection failed:", error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    prismaLogger.info("Database disconnected successfully");
  } catch (error) {
    prismaLogger.error("Database disconnection failed:", error);
  }
}
