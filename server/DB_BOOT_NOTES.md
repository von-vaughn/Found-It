# DB Boot Notes — FoundIt (Postgres via Docker)

## 0. What this project uses
- Defined in `server/docker-compose.yml`: service `db` → image `postgres:16-alpine`, container `foundit-postgres`, DB `foundit`, port `5432:5432`.
- Connection string in `server/.env`: `DATABASE_URL=postgresql://foundit:foundit123@localhost:5432/foundit`
- `npm run db:up` = `docker compose up -d db` (see `server/package.json`)
- Tables (`users`, `refresh_tokens`) are auto-created on API boot by `src/db/migrate.ts`, seeded by `src/db/seed.ts`. No manual SQL needed.

## 1. Pre-check (avoid port conflict)
Your machine may already run a local system Postgres on port 5432.

```bash
cd ~/Documents/School/Found-It/server
ss -ltn | grep 5432
pg_isready -h localhost -p 5432
docker compose ps
```

- If `ss` shows `LISTEN ... :5432` but `docker compose ps` shows no `foundit-postgres`, the port is taken by local Postgres.

## 2. Stop local Postgres (if port is taken)
```bash
sudo systemctl stop postgresql
sudo systemctl status postgresql   # expect: Active: inactive (dead)
ss -ltn | grep 5432                # expect: no output = free
```

Note: command is `postgresql`, not `postgreqsl`.

## 3. Boot the Docker DB
```bash
npm run db:up
```

Expected success:
```
✔ Container foundit-postgres Started
```

Failed case (port still in use):
```
Error ... failed to bind host port 0.0.0.0:5432/tcp: address already in use
```
→ Go back to Step 2.

## 4. Verify DB is Up and Reachable
```bash
docker compose ps
# expect: foundit-postgres ... Up ... 0.0.0.0:5432->5432/tcp

docker logs foundit-postgres --tail 20
# expect: database system is ready to accept connections

pg_isready -h localhost -p 5432
# expect: localhost:5432 - accepting connections
```

Correct spelling matters:
- `pg_isready -h localhost -p 5432` ✓
- `pg_isready -h locahost 5432` ✗ → `no response / too many arguments`
- Container name is `foundit-postgres` (no extra `q`)

First boot takes ~10-15s (initdb). If `no response`, wait and retry.

## 5. Fix broken networking (Up but no PORTS)
Symptom:
```
docker compose ps  # STATUS=Up but PORTS column empty
ss -ltn | grep 5432  # empty
pg_isready ... no response
```
Cause: first `up` failed halfway (port conflict) and left bad network state.

Fix:
```bash
docker compose down
docker compose up -d db
sleep 5
docker compose ps
pg_isready -h localhost -p 5432
```

## 6. Start the API (auto-migrate + seed)
```bash
npm run dev
# expect: PostgreSQL connected, migrated, and seeded.
# expect: Server running on http://localhost:3000
```

Verify:
```bash
curl http://localhost:3000/health
```

## 7. Useful commands
```bash
npm run db:up    # start DB
npm run db:down  # stop + remove container/network (data stays in volume server_foundit-pgdata)
docker logs foundit-postgres --tail 50
docker port foundit-postgres
```
