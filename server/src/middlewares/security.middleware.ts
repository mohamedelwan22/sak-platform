import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { isProduction } from "../config/env.js";

type HelmetMiddleware = ReturnType<typeof helmet>;

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "autoplay=()",
  "battery=()",
  "camera=()",
  "cross-origin-isolated=()",
  "display-capture=()",
  "document-domain=()",
  "encrypted-media=()",
  "execution-while-not-rendered=()",
  "execution-while-out-of-viewport=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "keyboard-map=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "navigation-override=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "sync-xhr=(self)",
  "usb=()",
  "web-share=()",
  "xr-spatial-tracking=()",
].join(", ");

function createCspDirectives() {
  return {
    defaultSrc: ["'none'"],
    scriptSrc: ["'none'"],
    styleSrc: ["'none'"],
    imgSrc: ["'none'"],
    fontSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    connectSrc: ["'none'"],
    workerSrc: ["'none'"],
    childSrc: ["'none'"],
    formAction: ["'none'"],
    baseUri: ["'none'"],
    frameAncestors: ["'none'"],
  };
}

function createDevMiddleware(): HelmetMiddleware {
  return helmet({
    contentSecurityPolicy: {
      directives: createCspDirectives(),
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    hsts: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    xssFilter: false,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    dnsPrefetchControl: { allow: false },
  });
}

function createProductionMiddleware(): HelmetMiddleware {
  return helmet({
    contentSecurityPolicy: {
      directives: createCspDirectives(),
    },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    xssFilter: false,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    dnsPrefetchControl: { allow: false },
  });
}

let cachedMiddleware: HelmetMiddleware | null = null;

function getSecurityMiddleware(): HelmetMiddleware {
  if (!cachedMiddleware) {
    cachedMiddleware = isProduction() ? createProductionMiddleware() : createDevMiddleware();
  }
  return cachedMiddleware;
}

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  getSecurityMiddleware()(req, res, () => {
    if (!res.getHeader("Permissions-Policy")) {
      res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
    }
    next();
  });
}
