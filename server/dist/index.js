"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const migrate_1 = require("./db/migrate");
const seed_1 = require("./db/seed");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const items_routes_1 = __importDefault(require("./routes/items.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const error_handler_1 = require("./middleware/error-handler");
const rate_limit_1 = require("./middleware/rate-limit");
const mailer_1 = require("./utils/mailer");
const google_drive_1 = require("./utils/google-drive");
const app = (0, express_1.default)();
// Trust first proxy hop (correct client IP for rate-limiting behind docker/nginx proxy)
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: env_1.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // In dev, allow requests with no origin (curl/local dev scripts)
        if (!origin) {
            if (env_1.env.NODE_ENV !== 'production')
                return callback(null, true);
            return callback(null, false);
        }
        const isDevLocalhost = env_1.env.NODE_ENV !== 'production' &&
            (origin.includes('localhost') || origin.includes('127.0.0.1'));
        if (isDevLocalhost || env_1.env.ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        // Not allowed: send no CORS headers (browser blocks it). Auth routes are
        // additionally rejected with 403 by the CSRF middleware.
        return callback(null, false);
    },
    credentials: true,
}));
app.use((0, morgan_1.default)('dev'));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: '10kb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// Liveness (no dependencies) + readiness (DB check)
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});
app.get('/ready', async (_req, res) => {
    try {
        await (0, db_1.checkDbConnection)();
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
    }
    catch {
        res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
});
app.use('/api/', rate_limit_1.apiLimiter);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/items', items_routes_1.default);
app.use('/api/categories', categories_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use(error_handler_1.notFound);
app.use(error_handler_1.errorHandler);
async function boot() {
    try {
        (0, mailer_1.assertMailConfigured)();
        await (0, db_1.checkDbConnection)();
        await (0, migrate_1.migrate)();
        await (0, seed_1.seed)();
        console.log('PostgreSQL connected, migrated, and seeded.');
        if ((0, google_drive_1.isDriveConfigured)()) {
            const driveOk = await (0, google_drive_1.testDriveConnection)();
            if (driveOk) {
                console.log('Google Drive API connected and authenticated.');
            }
            else {
                console.warn('Google Drive API credentials configured but connection check failed.');
            }
        }
    }
    catch (err) {
        console.error('Failed to connect/migrate PostgreSQL:', err);
        console.error('Hint: copy .env.example to .env and set DATABASE_URL, or run: docker compose up -d db');
        process.exit(1);
    }
    const server = app.listen(env_1.env.PORT, () => {
        console.log(`Server running on http://localhost:${env_1.env.PORT}`);
    });
    const shutdown = (signal) => {
        console.log(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
            void db_1.pool.end().then(() => {
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
exports.default = app;
//# sourceMappingURL=index.js.map