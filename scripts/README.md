# Scripts

## Database migrations

Run pending migrations against the **remote** Supabase database:

```bash
npm run db:migrate
```

**Required:** Set `SUPABASE_DB_URL` (or `DATABASE_URL`) in `.env` at the repo root.

- Get it from: **Supabase Dashboard → Project Settings → Database → Connection string (URI)**.
- Use the **Session mode** URI (or Transaction for pooling). Example:
  `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

When you add a new migration file under `supabase/migrations/`, add its filename to the `PENDING_MIGRATIONS` array in `scripts/run-migrations.ts` so it runs on the next `npm run db:migrate`.

To run **all** migrations in order (e.g. for a fresh DB):

```bash
npm run db:migrate:all
```

## Deploy Edge Functions

Deploy all Supabase Edge Functions to the linked project:

```bash
npm run deploy:functions
```

Requires the Supabase CLI to be logged in (`npx supabase login`). Uses project ref from `supabase/config.toml`.
