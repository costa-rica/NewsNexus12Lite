# NewsNexus12Lite Seed Scripts

`seed-defaults.ts` is a one-time copy script. It may read from a NewsNexus12 database only when `api/.env.seed` is supplied, and it writes copied prompt rows into the Lite-owned database only.

Required `api/.env.seed` variables. The Lite `DATABASE_URL` should not include a password when local `trust` auth is configured:

```sh
DATABASE_URL=postgres://newsnexus12lite_user@localhost:5432/newsnexus12lite
NEWSNEXUS12_DATABASE_URL=postgres://readonly_user@localhost:5432/newsnexus12
```

Run from `api/`:

```sh
npm run seed
```

The script upserts by `prompt_key`, so it is idempotent. Run it twice and verify `default_prompts` still has exactly five rows. Rows with `source = "copied"` came from NewsNexus12; rows with `source = "authored"` used Lite fallback text because no source prompt was found.
