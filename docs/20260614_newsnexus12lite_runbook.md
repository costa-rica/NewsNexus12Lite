---
created_at: 2026-06-14
updated_at: 2026-06-14
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# NewsNexus12Lite Runbook

## 1. Preserve Ecosystem Isolation

NewsNexus12Lite owns its runtime code, database, environment files, prompt copies, fixtures, and generated session state. Do not import runtime packages from `/home/limited_user/applications/NewsNexus12`, do not point Lite at NewsNexus12 services, and do not write to NewsNexus12.

Allowed overlap is one-time copying only: prompt text or fixture content may be copied from NewsNexus12 into Lite-owned files or the Lite-owned database. After copying, Lite must run from its own copy.

## 2. Create the Lite Postgres Database

Create a separate database, login role, and schema for Lite. Do not assign a password to the Lite database role; local passwordless access is enabled in the next section through Postgres `trust` authentication for localhost only.

Run the database and role setup from a normal shell prompt:

```sh
sudo -u postgres psql <<'SQL'
CREATE DATABASE newsnexus12lite;
CREATE ROLE newsnexus12lite_user WITH LOGIN;
GRANT ALL PRIVILEGES ON DATABASE newsnexus12lite TO newsnexus12lite_user;
SQL
```

Then run the schema setup in a separate `psql` invocation connected directly to the Lite database. If your first attempt already created the database and role, start here instead of rerunning the first block:

```sh
sudo -u postgres psql -d newsnexus12lite <<'SQL'
CREATE SCHEMA IF NOT EXISTS public;
ALTER SCHEMA public OWNER TO newsnexus12lite_user;
GRANT ALL ON SCHEMA public TO newsnexus12lite_user;
SQL
```

If you choose to use an interactive `sudo -u postgres psql` session instead, run `\c newsnexus12lite` or `\connect newsnexus12lite` alone on its own line before running the schema commands. Do not paste a `\c` or `\connect` meta-command on the same line as SQL.

Use a separate read-only NewsNexus12 role only for the optional copy script. Never reuse a write-capable NewsNexus12 credential. If your Postgres host requires a non-`public` schema, add it to the Lite `DATABASE_URL` connection options and keep it Lite-owned.

## 3. Allow Passwordless Local Connections

Mirror the NewsNexus12 Postgres setup by allowing local processes on the server to connect to Postgres without a password. This should be limited to localhost; do not expose Postgres port `5432` to the internet.

Find the active `pg_hba.conf` path:

```sh
sudo -u postgres psql -c 'SHOW hba_file;'
```

Edit that file with sudo. Put the localhost `host` rules in the existing IPv4/IPv6 local connections section near the end of `pg_hba.conf`, before any broader `scram-sha-256` or `md5` host rule that would also match localhost. Do not add a duplicate IPv4 line if `127.0.0.1/32` already uses `trust`.

If the file already shows the IPv4 localhost line as `trust`, only change the existing IPv6 localhost line from `scram-sha-256` to `trust`:

Before:

```conf
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256
```

After:

```conf
# IPv4 local connections:
host    all             all             127.0.0.1/32            trust
# IPv6 local connections:
host    all             all             ::1/128                 trust
```

Reload Postgres after saving the file:

```sh
sudo systemctl reload postgresql
```

Confirm the Lite user can connect locally without a password:

```sh
psql -h localhost -U newsnexus12lite_user -d newsnexus12lite -c 'SELECT current_user, current_database();'
```

Use a passwordless Lite connection string in `api/.env`: `postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite`.

## 4. Create `api/.env`

Copy `api/.env.example` to `api/.env` and fill in Lite-only values:

```sh
PORT=4000
DATABASE_URL=postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite
PIPELINE_MODE=mock
AI_API_KEY=
MOCK_STAGE_DELAY_MS=250
HOURLY_RATE_LIMIT=200
DAILY_RATE_LIMIT=1000
```

Leave `AI_API_KEY` empty in mock mode. In live mode, set it to a real key locally only; do not commit it.

## 5. Create `portal/.env.local`

Copy `portal/.env.local.example` to `portal/.env.local`:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SNAPSHOT_INTERVAL_MS=5000
```

This URL must point to the Lite backend, not NewsNexus12.

## 6. Optional Prompt Source Files

If you want to seed from markdown files instead of the NewsNexus12 database, place source markdown files under a Lite-owned path such as `api/seed-inputs/prompts/`. Keep filenames descriptive and do not store secrets in markdown.

The app does not require runtime reads from these markdown files. They are source material for copying into Lite defaults only.

## 7. Copy Prompts from NewsNexus12

Create `api/.env.seed` with placeholders replaced locally:

```sh
DATABASE_URL=postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite
NEWSNEXUS12_DATABASE_URL=postgres://readonly_newsnexus12_user@localhost:5432/newsnexus12
```

Run the copy from `api/`:

```sh
npm run seed
```

The script reads NewsNexus12 prompt tables using the supplied read-only URL and upserts five Lite-owned default rows: gateway, chemical, wildfire, severe weather, and state assigner. Missing source prompts are filled with authored Lite fallbacks.

## 8. Run Migrations and Seed Fixtures

Start the API once to run Sequelize sync:

```sh
cd api
npm run dev
```

Then run the seed command if you are copying prompts. Mock RSS also has hard-coded fallback fixtures, so a fixture table is optional for the demo.

## 9. Start the Backend

From `api/`:

```sh
npm run dev
```

The backend listens on `http://localhost:4000` by default. Use `PIPELINE_MODE=mock` for local demo runs without AI credentials.

## 10. Start the Frontend

The Lite portal is assigned to port `4001`. Install portal dependencies, then run the dev server:

```sh
cd portal
npm install
npm run dev
```

Open `http://localhost:4001`. The first-launch modal should appear on a fresh browser session.

## 11. Verify the Backend

From `api/`:

```sh
npm run lint
npm run build
npm test
```

Basic API checks:

```sh
curl -i http://localhost:4000/health
curl -i -X POST http://localhost:4000/api/rss/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"chemical spill texas"}'
```

## 12. Verify the Frontend

From `portal/` after dependencies install:

```sh
npm run lint
npm run type-check
npm run build
npm test
```

Manual checks: search RSS, start a mock run, watch stage progress, stop a run, open score explanations, edit prompts, apply prompts, and reset prompts.

## 13. Troubleshooting

If the API says `DATABASE_URL` is missing, confirm `api/.env` exists and the command is running from `api/`.

If the portal cannot reach the API, confirm `NEXT_PUBLIC_API_BASE_URL` points to the Lite API and the API process is running.

If seeding fails against NewsNexus12, confirm `NEWSNEXUS12_DATABASE_URL` uses a read-only source credential and that the Lite database URL is separate.

If rate-limit errors appear, wait for the `Retry-After` duration or lower request frequency. Do not disable rate limits in committed files.

If prompt edits do not affect an already-running stage, that is expected. Lite captures editable prompts at the moment each editable stage begins.
