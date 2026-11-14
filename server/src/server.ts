import http from "http";
import { app } from "./app";
import { env, integrationStatus } from "./config/env";
import { initSocketServer } from "./sockets";
import { logger } from "./utils/logger";

const httpServer = http.createServer(app);

initSocketServer(httpServer);

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.warn(`Port ${env.PORT} is already in use by another running server instance.`);
  } else {
    logger.error("HTTP server error", { error: err.message });
  }
});

httpServer.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`SKYGO Server listening on http://127.0.0.1:${env.PORT}`, {
    environment: env.NODE_ENV,
    timezone: env.DEFAULT_TIMEZONE,
    currency: env.DEFAULT_CURRENCY,
    integrations: integrationStatus
  });
});
