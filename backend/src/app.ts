import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env';
import { helmetMiddleware, corsMiddleware } from './middleware/helmet';
import { globalRateLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler, errorHandler } from './middleware/error';
import { checkDbConnection } from './config/db';

import authRoutes from './modules/auth/routes';
import usersRoutes from './modules/users/routes';
import geoRoutes from './modules/geo/routes';
import verificationsRoutes from './modules/verifications/routes';
import reputationRoutes from './modules/reputation/routes';
import hireRoutes from './modules/hire/routes';
import hireCategoriesRoutes from './modules/hire/categories-routes';
import rentRoutes from './modules/rent/routes';
import rentCategoriesRoutes from './modules/rent/categories-routes';
import marketRoutes from './modules/market/routes';
import marketCategoriesRoutes from './modules/market/categories-routes';
import communityRoutes from './modules/community/routes';
import learnRoutes from './modules/learn/routes';
import chatRoutes from './modules/chat/routes';
import notificationsRoutes from './modules/notifications/routes';
import uploadsRoutes from './modules/uploads/routes';
import adminRoutes from './modules/admin/routes';
import reportsRoutes from './modules/reports/routes';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1); // needed for correct req.ip behind Render/Railway's proxy

  app.use(requestLogger);  // attach X-Request-ID and log every HTTP transaction
  app.use(compression()); // gzip/deflate all responses — biggest bandwidth win for list endpoints
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(globalRateLimiter);

  app.get('/health', async (_req, res) => {
    const dbOk = await checkDbConnection();
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'degraded', db: dbOk });
  });

  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', usersRoutes);
  apiRouter.use('/geo', geoRoutes);
  apiRouter.use('/verifications', verificationsRoutes);
  // reputationRoutes defines its own absolute path (/users/:id/reputation),
  // so it's mounted at the API router root rather than under a prefix.
  apiRouter.use('/', reputationRoutes);
  apiRouter.use('/', hireCategoriesRoutes);
  apiRouter.use('/', hireRoutes);
  apiRouter.use('/', rentCategoriesRoutes);
  apiRouter.use('/', rentRoutes);
  apiRouter.use('/', marketCategoriesRoutes);
  apiRouter.use('/', marketRoutes);
  apiRouter.use('/', communityRoutes);
  apiRouter.use('/', learnRoutes);
  apiRouter.use('/', chatRoutes);
  apiRouter.use('/', notificationsRoutes);
  apiRouter.use('/', uploadsRoutes);
  apiRouter.use('/', adminRoutes);
  apiRouter.use('/', reportsRoutes);

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
