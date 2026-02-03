import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'
import { app } from 'electron'

/**
 * Initialize the database by applying Prisma migrations
 * This reads migration files from the bundled migrations folder
 */
export function initializeDatabase(dbPath: string): void {
  try {
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    // Open database (creates file if it doesn't exist)
    const db = new Database(dbPath)

    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `)

    // Get the migrations directory path
    // In production, migrations are bundled with the app
    const migrationsPath = app.isPackaged
      ? path.join(process.resourcesPath, 'prisma', 'migrations')
      : path.join(app.getAppPath(), 'prisma', 'migrations')

    if (!fs.existsSync(migrationsPath)) {
      console.warn('Migrations folder not found at:', migrationsPath)
      db.close()
      return
    }

    // Get all migration folders
    const migrationFolders = fs
      .readdirSync(migrationsPath)
      .filter((item) => {
        const itemPath = path.join(migrationsPath, item)
        return fs.statSync(itemPath).isDirectory()
      })
      .sort() // Apply migrations in chronological order

    // Get already applied migrations
    const appliedMigrations = db
      .prepare('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL')
      .all() as { migration_name: string }[]

    const appliedMigrationNames = new Set(appliedMigrations.map((m) => m.migration_name))

    // Apply pending migrations
    for (const migrationFolder of migrationFolders) {
      if (appliedMigrationNames.has(migrationFolder)) {
        continue // Skip already applied migrations
      }

      const migrationSqlPath = path.join(migrationsPath, migrationFolder, 'migration.sql')

      if (!fs.existsSync(migrationSqlPath)) {
        console.warn(`No migration.sql found for ${migrationFolder}`)
        continue
      }

      console.log(`Applying migration: ${migrationFolder}`)

      const migrationSql = fs.readFileSync(migrationSqlPath, 'utf-8')
      const migrationId = `${Date.now()}-${migrationFolder}`

      try {
        // Record migration start
        db.prepare(
          'INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, ?, ?)'
        ).run(migrationId, '', migrationFolder, new Date().toISOString(), 0)

        // Apply migration
        db.exec(migrationSql)

        // Mark migration as complete
        db.prepare('UPDATE _prisma_migrations SET finished_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          migrationId
        )

        console.log(`✓ Applied migration: ${migrationFolder}`)
      } catch (error) {
        console.error(`Failed to apply migration ${migrationFolder}:`, error)
        // Record failure
        db.prepare('UPDATE _prisma_migrations SET logs = ? WHERE id = ?').run(
          (error as Error).message,
          migrationId
        )
        throw error
      }
    }

    db.close()
    console.log('Database migrations completed successfully!')
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}
