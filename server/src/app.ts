import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler, requestLog } from "./middlewares/index.js";
import { logger } from "./lib/logger.js";

export function createApp(): express.Express {
  const env = getEnv();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(morgan("short", { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(requestLog);

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  });

  app.get("/version", (_req, res) => {
    res.json({
      success: true,
      data: {
        name: "sak100-server",
        version: "1.0.0",
        environment: env.NODE_ENV,
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
