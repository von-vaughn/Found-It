import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { checkDbConnection } from './config/db';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// 404 + error handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

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

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

void boot();

export default app;
