import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().min(1),
  DATABASE_DIRECT_URL: z.string().optional(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  MAIL_HOST: z.string().default("localhost"),
  MAIL_PORT: z.coerce.number().default(1025),
  MAIL_USER: z.string().optional().default(""),
  MAIL_PASSWORD: z.string().optional().default(""),
  MAIL_FROM: z.string().email().default("noreply@sak100.com"),

  UPLOAD_PATH: z.string().default("./uploads"),

  CORS_ORIGIN: z
    .string()
    .default("http://localhost:8080,http://localhost:3000")
    .transform((val) => val.split(",").map((s) => s.trim())),

  CLIENT_URL: z.string().default("http://localhost:8080"),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

  AUTH_REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

type Env = z.infer<typeof envSchema>;

let _env: Env;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format());
      throw new Error("Invalid environment variables. Check server/.env");
    }
    _env = result.data;
  }
  return _env;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === "development";
}
