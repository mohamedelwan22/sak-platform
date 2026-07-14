import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import {
  errorHandler,
  notFoundHandler,
  requestId,
  responseTime,
  requestLogger,
} from "./middlewares/index.js";
import { logger } from "./lib/logger.js";
import routes from "./routes/index.js";

export function createApp(): express.Express {
  const env = getEnv();
  const app = express();

  // Global middleware
  app.use(requestId);
  app.use(responseTime);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(morgan("short", { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(requestLogger);

  // Mount all routes
  app.use(routes);

  // Global error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
