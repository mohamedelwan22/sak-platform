import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { logger } from "./lib/logger.js";

function bootstrap(): void {
  const env = getEnv();
  const app = createApp();

  app.listen(env.PORT, () => {
    logger.info(`SAK100 Server running on port ${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Health: http://localhost:${env.PORT}/health`);
    logger.info(`Version: http://localhost:${env.PORT}/version`);
  });
}

bootstrap();
