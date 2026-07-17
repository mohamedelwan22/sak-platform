import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getEnv } from "../../../config/env.js";
import type { TokenPayload, DeviceInfo } from "../types/index.js";

export function generateAccessToken(payload: TokenPayload): string {
  const env = getEnv();
  const seconds = parseDurationSeconds(env.JWT_EXPIRES_IN);
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: seconds,
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyAccessToken(token: string): TokenPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function getRefreshTokenExpiry(): Date {
  const env = getEnv();
  const expiresMs = parseDuration(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + expiresMs);
}

export function parseDeviceInfo(req: {
  headers: {
    "user-agent"?: string;
    "x-forwarded-for"?: string;
    "x-device-name"?: string;
    "x-platform"?: string;
  };
  ip?: string;
}): DeviceInfo {
  const userAgent = req.headers["user-agent"] ?? "";
  const parsed = parseUserAgent(userAgent);

  return {
    userAgent,
    ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.ip,
    platform: req.headers["x-platform"] ?? parsed.os,
    deviceName: req.headers["x-device-name"],
    browser: parsed.browser,
    operatingSystem: parsed.os,
  };
}

function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) {
    browser = "Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
  } else if (ua.includes("Chrome") && !ua.includes("Edg/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari";
  } else if (ua.includes("Opera") || ua.includes("OPR")) {
    browser = "Opera";
  } else if (ua.includes("curl")) {
    browser = "curl";
  } else if (ua.includes("node")) {
    browser = "Node.js";
  } else if (ua.includes("PostmanRuntime")) {
    browser = "Postman";
  }

  if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
  }

  return { browser, os };
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function parseDurationSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 15 * 60;
  }
}
