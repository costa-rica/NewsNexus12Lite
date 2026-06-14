---
created_at: 2026-06-14
updated_at: 2026-06-14
created_by: codex (gpt-5)
modified_by: codex (gpt-5)
---

# NewsNexus12Lite database setup on macOS

## 1. Install and start PostgreSQL

- Install PostgreSQL with Homebrew if it is not already installed:

```sh
brew install postgresql@16
```

- Put the PostgreSQL tools on your current shell path:

```sh
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
```

- Start PostgreSQL:

```sh
brew services start postgresql@16
```

- Confirm `psql` is available:

```sh
psql --version
```

## 2. Create the Lite database and login role

- Create the passwordless local role and Lite-owned database:

```sh
psql postgres <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'newsnexus12lite_user') THEN
    CREATE ROLE newsnexus12lite_user WITH LOGIN;
  END IF;
END
$$;

SELECT 'CREATE DATABASE newsnexus12lite OWNER newsnexus12lite_user'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'newsnexus12lite')\gexec

GRANT ALL PRIVILEGES ON DATABASE newsnexus12lite TO newsnexus12lite_user;
SQL
```

- Assign the `public` schema to the Lite role:

```sh
psql newsnexus12lite <<'SQL'
CREATE SCHEMA IF NOT EXISTS public;
ALTER SCHEMA public OWNER TO newsnexus12lite_user;
GRANT ALL ON SCHEMA public TO newsnexus12lite_user;
SQL
```

## 3. Allow passwordless localhost access

- Find the active `pg_hba.conf` file:

```sh
psql postgres -tAc 'SHOW hba_file;'
```

- Open that file in an editor:

```sh
HBA_FILE="$(psql postgres -tAc 'SHOW hba_file;' | xargs)"
nano "$HBA_FILE"
```

- Add these rules before broader localhost rules that use `scram-sha-256` or `md5`:

```conf
host    newsnexus12lite    newsnexus12lite_user    127.0.0.1/32    trust
host    newsnexus12lite    newsnexus12lite_user    ::1/128         trust
```

- Reload PostgreSQL:

```sh
pg_ctl reload -D "$(psql postgres -tAc 'SHOW data_directory;' | xargs)"
```

## 4. Verify the database connection

- Connect as the Lite role without a password prompt:

```sh
psql -h localhost -U newsnexus12lite_user -d newsnexus12lite -c 'SELECT current_user, current_database();'
```

- The returned user should be `newsnexus12lite_user`, and the returned database should be `newsnexus12lite`.

## 5. Set the API database URL

- From the repo root, create `api/.env` if it does not already exist:

```sh
cd /Users/nick/Documents/NewsNexus12Lite
test -f api/.env || cp api/.env.example api/.env
```

- Make sure `api/.env` contains this Lite database URL:

```sh
DATABASE_URL=postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite
```

## 6. Create the Sequelize tables

- From `api/`, load the env file and start the API long enough for Sequelize sync to create the database tables:

```sh
cd /Users/nick/Documents/NewsNexus12Lite/api
set -a
source .env
set +a
npm run dev
```

- Stop the process with `control-c` after it prints that the API is listening.

- Verify the database tables exist:

```sh
psql -h localhost -U newsnexus12lite_user -d newsnexus12lite -c '\dt'
```

## 7. Optional seed default prompts

- Skip this step unless you have a read-only NewsNexus12 source database URL.

- Create `api/.env.seed` locally with the Lite database URL and the read-only source URL:

```sh
DATABASE_URL=postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite
NEWSNEXUS12_DATABASE_URL=postgres://readonly_newsnexus12_user@localhost:5432/newsnexus12
```

- Run the seed command with the seed env loaded:

```sh
cd /Users/nick/Documents/NewsNexus12Lite/api
set -a
source .env.seed
set +a
npm run seed
```

- Verify the seeded default prompt rows:

```sh
psql -h localhost -U newsnexus12lite_user -d newsnexus12lite -c 'SELECT prompt_key, source FROM default_prompts ORDER BY prompt_key;'
```
