import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocketServer } from './config/socket';
import { checkDbConnection } from './config/db';
import { logger } from './lib/logger';

/** Retries DB connection with exponential backoff before giving up.
 *  Critical on Railway/Render where the Postgres service may still be
 *  initialising when the backend container starts. */
async function waitForDb(maxAttempts = 5, initialDelayMs = 2000): Promise<void> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await checkDbConnection();
    if (ok) {
      logger.info('Database connection established');
      return;
    }
    if (attempt === maxAttempts) {
      logger.warn('Could not reach database after all retries — starting anyway; requests may fail until DB is ready.');
      return;
    }
    logger.warn(`Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms…`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 30_000); // exponential backoff, cap at 30s
  }
}

async function main(): Promise<void> {
  await waitForDb();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`LocalLink backend listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => process.exit(0));
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
