import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { checkDbConnection, pool } from './config/db';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import itemsRoutes from './routes/items.routes';
import categoriesRoutes from './routes/categories.routes';
import buildingsRoutes from './routes/buildings.routes';
import claimsRoutes from './routes/claims.routes';
import returnsRoutes from './routes/returns.routes';
import uploadRoutes from './routes/upload.routes';
import notificationsRoutes from './routes/notifications.routes';
import auditLogsRoutes from './routes/audit-logs.routes';
import { errorHandler, notFound } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { assertMailConfigured } from './utils/mailer';
import { isDriveConfigured, testDriveConnection } from './utils/google-drive';
import {
  deleteExpiredUnsurrenderedFoundItems,
  FOUND_ITEM_SURRENDER_EXPIRY_DAYS,
} from './repositories/item.repository';

const app = express();

// Trust first proxy hop (correct client IP for rate-limiting behind docker/nginx proxy)
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // In dev, allow requests with no origin (curl/local dev scripts)
      if (!origin) {
        if (env.NODE_ENV !== 'production') return callback(null, true);
        return callback(null, false);
      }
      const isDevLocalhost =
        env.NODE_ENV !== 'production' &&
        (origin.includes('localhost') || origin.includes('127.0.0.1'));
      if (isDevLocalhost || env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Not allowed: send no CORS headers (browser blocks it). Auth routes are
      // additionally rejected with 403 by the CSRF middleware.
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Liveness (no dependencies) + readiness (DB check)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/ready', async (_req, res) => {
  try {
    await checkDbConnection();
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

app.use('/api/', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/buildings', buildingsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

app.use(notFound);
app.use(errorHandler);

async function boot(): Promise<void> {
  try {
    assertMailConfigured();
    await checkDbConnection();
    await migrate();
    await seed();
    console.log('PostgreSQL connected, migrated, and seeded.');

    if (isDriveConfigured()) {
      const driveOk = await testDriveConnection();
      if (driveOk) {
        console.log('Google Drive API connected and authenticated.');
      } else {
        console.warn('Google Drive API credentials configured but connection check failed.');
      }
    }
  } catch (err) {
    console.error('Failed to connect/migrate PostgreSQL:', err);
    console.error('Hint: copy .env.example to .env and set DATABASE_URL, or run: docker compose up -d db');
    process.exit(1);
  }

  const runFoundExpiryCleanup = async (): Promise<void> => {
    try {
      const { deletedCount } = await deleteExpiredUnsurrenderedFoundItems(
        FOUND_ITEM_SURRENDER_EXPIRY_DAYS,
      );
      if (deletedCount > 0) {
        console.log(
          `[Expiry Cleanup] Auto-deleted ${deletedCount} un-surrendered found item post(s) older than ${FOUND_ITEM_SURRENDER_EXPIRY_DAYS} days.`,
        );
      }
    } catch (err) {
      console.error('[Expiry Cleanup] Failed to clean up expired found items:', err);
    }
  };

  await runFoundExpiryCleanup();
  const expiryCleanupTimer = setInterval(() => {
    void runFoundExpiryCleanup();
  }, 60 * 60 * 1000);
  expiryCleanupTimer.unref();

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    clearInterval(expiryCleanupTimer);
    server.close(() => {
      void pool.end().then(() => {
        console.log('Database pool closed.');
        process.exit(0);
      });
    });
    // Force exit if connections don't drain
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  void boot();
}

export { app };
export default app;
