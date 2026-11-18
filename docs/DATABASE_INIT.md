# Database Configuration and Local Data

## Main application database

The app uses PostgreSQL for its books, users, tags, loans, and other library
records. The connection URL is configured in **Settings** and saved locally in
Electron's `userData/settings.json`. The app does not create a production
`dev.db` SQLite database.

The PostgreSQL connection is initialized in `src/main/lib/prisma.ts`. The Prisma
schema is in `prisma/schema.prisma`, and database migrations are kept in
`prisma/migrations/`.

## Quick Capture local storage

Quick Capture uses a separate local SQLite database and stores captured images
on the computer. Both are kept in the app's Electron `userData/captures`
directory:

- `captures.db` — captured-book queue and metadata.
- `*_front.jpg` and `*_back.jpg` — captured book images.

The location is determined by Electron's `app.getPath('userData')`; it is
independent of the GitHub repository name. See `src/main/lib/captureDb.ts` and
`src/main/controllers/capture.ts`.

## Legacy SQLite migration

`prisma/dev.db` is a legacy SQLite data source used by
`scripts/migrate-to-supabase.ts` to import existing records into PostgreSQL. It
is not the app's current production database. The migration script requires a
PostgreSQL `DATABASE_URL`; if the legacy SQLite file is absent, there is no
local database to import.

## Schema changes

1. Update `prisma/schema.prisma`.
2. Create a migration using the project's Prisma migration workflow.
3. Test the migration against a development PostgreSQL database before
   releasing.

Back up the PostgreSQL database before applying production schema changes. See
[`BACKUP.md`](./BACKUP.md) for backup and restore guidance.
