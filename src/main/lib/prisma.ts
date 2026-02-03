import 'dotenv/config'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import path from 'path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../../generated/prisma/client'
import { initializeDatabase } from './initDatabase'

// Get database path from environment or use default
let connectionString = process.env.DATABASE_URL || 'file:./dev.db'
let dbFilePath: string

// If it's a relative path, resolve it properly for dev vs production
if (connectionString.startsWith('file:./') || connectionString.startsWith('file:../')) {
  const dbPath = connectionString.replace('file:', '')
  dbFilePath = is.dev
    ? path.join(process.cwd(), dbPath)
    : path.join(app.getPath('userData'), dbPath)
  connectionString = `file:${dbFilePath}`
} else if (connectionString.startsWith('file:')) {
  dbFilePath = connectionString.replace('file:', '')
} else {
  // Fallback
  dbFilePath = path.join(app.getPath('userData'), 'dev.db')
  connectionString = `file:${dbFilePath}`
}

// Initialize database if it doesn't exist or is empty
initializeDatabase(dbFilePath)

const adapter = new PrismaBetterSqlite3({ url: connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma, dbFilePath }
