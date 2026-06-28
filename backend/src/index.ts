import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { initSocketServer } from './config/socket';
import { checkDbConnection } from './config/db';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  const dbOk = await checkDbConnection();
  if (!dbOk) {
    logger.warn('Starting without a confirmed database connection — check DATABASE_URL.');
  }

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
