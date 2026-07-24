# Database Backup & Restore

Automated daily backups of the Supabase (Postgres) database using `pg_dump`.

## Prerequisites

`pg_dump` and `pg_restore` are included in the PostgreSQL client package.

**macOS:**

```bash
brew install libpq
brew link --force libpq
```

**Ubuntu/Debian:**

```bash
sudo apt install postgresql-client
```

**Alpine:**

```bash
apk add postgresql-client
```

## Backup Script

Create a script at a location of your choice (e.g., `/usr/local/bin/supabase-backup.sh`):

```bash
#!/bin/bash
set -e

BACKUP_DIR="/path/to/backups/supabase"
TIMESTAMP=$(date +%Y-%m-%d)

# Load DATABASE_URL from your project's .env
source /path/to/your/project/.env

pg_dump "$DATABASE_URL" -Fc > "$BACKUP_DIR/supabase-$TIMESTAMP.dump"

# Keep only the last 7 days
find "$BACKUP_DIR" -name "supabase-*.dump" -mtime +7 -delete

echo "[$(date)] Backup completed: supabase-$TIMESTAMP.dump" >> "$BACKUP_DIR/backup.log"
```

Make it executable:

```bash
chmod +x /usr/local/bin/supabase-backup.sh
```

## Schedule (Cron)

```bash
crontab -e
```

Add the following line to run at 10:30 PM daily:

```
30 22 * * * /usr/local/bin/supabase-backup.sh
```

## Restore

```bash
pg_restore -d "$DATABASE_URL" -c --if-exists /path/to/backup.dump
```

**Flags:**

- `-c` — drop database objects before recreating
- `--if-exists` — skip objects that don't exist

If using Prisma, run migrations after restore:

```bash
npx prisma migrate deploy
```
