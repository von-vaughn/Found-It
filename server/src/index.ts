import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { checkDbConnection, pool } from './config/db';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import { errorHandler, notFound } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';

const app = express();

// Trust first proxy hop (correct client IP for rate-limiting behind docker/proxy)
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors(
    env.ALLOWED_ORIGINS.length > 0
      ? { origin: env.ALLOWED_ORIGINS }
      : undefined,
  ),
);
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

app.use(notFound);
app.use(errorHandler);

async function boot(): Promise<void> {
  try {
    await checkDbConnection();
    await migrate();
    await seed();
    console.log('PostgreSQL connected, migrated, and seeded.');
  } catch (err) {
    console.error('Failed to connect/migrate PostgreSQL:', err);
    console.error('Hint: copy .env.example to .env and set DATABASE_URL, or run: docker compose up -d db');
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`Received ${signal}, shutting down gracefully...`);
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

void boot();

export default app;
