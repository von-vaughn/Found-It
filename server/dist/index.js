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
const env_1 = require("./config/env");
const db_1 = require("./config/db");
const migrate_1 = require("./db/migrate");
const seed_1 = require("./db/seed");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', users_routes_1.default);
// 404 + error handler
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error.' });
});
async function boot() {
    try {
        await (0, db_1.checkDbConnection)();
        await (0, migrate_1.migrate)();
        await (0, seed_1.seed)();
        console.log('PostgreSQL connected, migrated, and seeded.');
    }
    catch (err) {
        console.error('Failed to connect/migrate PostgreSQL:', err);
        console.error('Hint: copy .env.example to .env and set DATABASE_URL, or run: docker compose up -d db');
        process.exit(1);
    }
    app.listen(env_1.env.PORT, () => {
        console.log(`Server running on http://localhost:${env_1.env.PORT}`);
    });
}
void boot();
exports.default = app;
//# sourceMappingURL=index.js.map