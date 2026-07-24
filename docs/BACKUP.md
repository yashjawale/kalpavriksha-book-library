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
LOG_FILE="$BACKUP_DIR/backup.log"
TIMESTAMP=$(date +%Y-%m-%d)
START_TIME=$(date +%s)

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Load DATABASE_URL from your project's .env
source /path/to/your/project/.env

mkdir -p "$BACKUP_DIR"
log "Backup started: supabase-$TIMESTAMP.dump"

if ! pg_dump "$DATABASE_URL" -Fc > "$BACKUP_DIR/supabase-$TIMESTAMP.dump" 2>> "$LOG_FILE"; then
  log "ERROR: pg_dump failed"
  exit 1
fi

# Verify the dump is valid
if ! pg_restore -l "$BACKUP_DIR/supabase-$TIMESTAMP.dump" &>/dev/null; then
  log "ERROR: Backup file is corrupted, deleting"
  rm -f "$BACKUP_DIR/supabase-$TIMESTAMP.dump"
  exit 1
fi

log "Backup verified successfully"

# Prune old backups
OLD_COUNT=$(find "$BACKUP_DIR" -name "supabase-*.dump" -mtime +7 | wc -l)
find "$BACKUP_DIR" -name "supabase-*.dump" -mtime +7 -delete
[ "$OLD_COUNT" -gt 0 ] && log "Cleaned up $OLD_COUNT old backup(s)"

DURATION=$(($(date +%s) - START_TIME))
SIZE=$(du -h "$BACKUP_DIR/supabase-$TIMESTAMP.dump" | cut -f1)
log "Backup finished (${DURATION}s) — size: $SIZE"
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
