import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { env } from '../config/env';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // API-only; CSP is the frontend's responsibility
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow no-origin requests (curl, server-to-server, mobile webviews)
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true, // required for httpOnly refresh cookie
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const corsMiddleware = cors(corsOptions);
