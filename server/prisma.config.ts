import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const baseUrl = env("DATABASE_URL");
const shadowUrl = process.env.SHADOW_DATABASE_URL ?? baseUrl?.replace(/\/[^/]+$/, "/sak100_shadow");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: baseUrl,
    shadowDatabaseUrl: shadowUrl,
  },
});