import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { ForbiddenError } from "../lib/errors.js";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_MAX_AGE_SECONDS = 60 * 60; // 1 hour

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Generate a new CSRF token and set it in a readable cookie.
 * Returns the token string (also sent to the client in response body).
 */
export function generateCsrfToken(res: Response): string {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: CSRF_MAX_AGE_SECONDS * 1000,
  });

  return token;
}

/**
 * Validate the double-submit cookie pattern:
 * Compare the token in the cookie with the token in the header.
 * Safe methods (GET, HEAD, OPTIONS) are always allowed.
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    next(new ForbiddenError("CSRF token missing"));
    return;
  }

  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    next(new ForbiddenError("CSRF token invalid"));
    return;
  }

  next();
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
