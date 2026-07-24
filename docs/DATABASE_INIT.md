# Database Initialization

## How it works

The application automatically handles database initialization on first run across all platforms (Mac, Windows, Linux).

### First-time Installation

When the app is installed and run for the first time:

1. **Database Location**:
   - **Development**: `./dev.db` (in the project root)
   - **Production**: `~/Library/Application Support/kalpavriksha-book-library/dev.db` (Mac)
   - **Production**: `%APPDATA%/kalpavriksha-book-library/dev.db` (Windows)
   - **Production**: `~/.config/kalpavriksha-book-library/dev.db` (Linux)

2. **Automatic Setup**:
   - The app checks if the database file exists
   - If not, it creates the directory structure automatically
   - Creates an empty SQLite database file
   - Applies all Prisma migrations in order
   - The app is ready to use immediately!

3. **Schema Management**:
   - Migrations are bundled with the app (from `prisma/migrations` folder)
   - No manual database setup required
   - Tables are created with proper indexes and foreign keys
   - Migration history is tracked in `_prisma_migrations` table

### Technical Details

- **Database Engine**: SQLite via Better-SQLite3
- **ORM**: Prisma Client with Better-SQLite3 adapter
- **Initialization**: Automatic migration application on startup
- **Migration**: Uses Prisma's generated migration files (not hardcoded SQL)

### For Developers

**When you change the schema:**

1. Update `prisma/schema.prisma`
2. Run `npm run prisma migrate dev --name your_migration_name`
3. Prisma generates a new migration file in `prisma/migrations/`
4. The migration is automatically applied in dev
5. When the app is built, migrations are bundled with it
6. On user's machines, the new migration applies automatically on next app launch

**The database initialization happens in:**

- `src/main/lib/initDatabase.ts` - Reads and applies migration files
- `src/main/lib/prisma.ts` - Path resolution and Prisma client setup
- `electron-builder.yml` - Bundles migrations in `extraResources`

**Migration tracking:**

- Applied migrations are recorded in `_prisma_migrations` table
- Each migration runs only once
- Migrations apply in chronological order
- Failed migrations are logged

### Backup & Restore

Users can:

- **Export backup**: Saves a copy of the database to any location
- **Import backup**: Restores a database from a backup file
- Original database is backed up before restore (as `dev.db.backup`)

### Best Practices

✅ Always use `prisma migrate dev` to create migrations  
✅ Never edit migration files manually after they're created  
✅ Test migrations before releasing new versions  
✅ Migrations are forward-only (no automatic rollbacks in production)  
✅ Keep migrations small and focused on one change
