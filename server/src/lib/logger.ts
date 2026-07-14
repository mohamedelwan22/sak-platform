import winston from "winston";
import { getEnv } from "../config/env.js";

const { combine, timestamp, printf, colorize, json } = winston.format;

function createLogger(): winston.Logger {
  const env = getEnv();
  const isDev = env.NODE_ENV === "development";

  const consoleFormat = printf(({ level, message, timestamp: ts, ...rest }) => {
    const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
    return `${ts} [${level}]: ${message}${meta}`;
  });

  const transports: winston.transport[] = [];

  if (isDev) {
    transports.push(
      new winston.transports.Console({
        format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), consoleFormat),
      }),
    );
  } else {
    transports.push(
      new winston.transports.Console({
        format: combine(timestamp(), json()),
      }),
    );
  }

  return winston.createLogger({
    level: env.LOG_LEVEL,
    defaultMeta: { service: "sak100-server" },
    transports,
  });
}

export const logger = createLogger();

export function createChildLogger(context: string): winston.Logger {
  return logger.child({ context });
}
