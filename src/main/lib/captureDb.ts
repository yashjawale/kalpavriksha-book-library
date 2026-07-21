import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import Database from 'better-sqlite3'

export type CapturedBookRow = {
  id: number
  frontImage: string
  backImage: string
  isbn: string | null
  title: string | null
  author: string | null
  publisher: string | null
  tagIds: string | null
  status: string
  isDuplicate: boolean
  createdAt: string
  updatedAt: string
}

let db: Database.Database | null = null

function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const capturesDir = join(userDataPath, 'captures')
  if (!fs.existsSync(capturesDir)) {
    fs.mkdirSync(capturesDir, { recursive: true })
  }

  const dbPath = join(capturesDir, 'captures.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS captured_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      frontImage TEXT NOT NULL,
      backImage TEXT NOT NULL DEFAULT '',
      isbn TEXT,
      title TEXT,
      author TEXT,
      publisher TEXT,
      tagIds TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      isDuplicate INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function createCapturedBook(data: {
  frontImage: string
  backImage: string
  isbn?: string | null
  tagIds?: string | null
  status?: string
}): CapturedBookRow {
  const d = getDb()
  const stmt = d.prepare(`
    INSERT INTO captured_books (frontImage, backImage, isbn, tagIds, status)
    VALUES (@frontImage, @backImage, @isbn, @tagIds, @status)
  `)
  const result = stmt.run({
    frontImage: data.frontImage,
    backImage: data.backImage,
    isbn: data.isbn ?? null,
    tagIds: data.tagIds ?? null,
    status: data.status ?? 'PENDING'
  })
  return getCapturedBookById(result.lastInsertRowid as number)!
}

export function getCapturedBookById(id: number): CapturedBookRow | undefined {
  const d = getDb()
  const row = d.prepare('SELECT * FROM captured_books WHERE id = ?').get(id) as
    | CapturedBookRow
    | undefined
  if (row) {
    row.isDuplicate = !!row.isDuplicate
  }
  return row
}

export function getPendingCapturedBook(): CapturedBookRow | undefined {
  const d = getDb()
  const row = d
    .prepare("SELECT * FROM captured_books WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 1")
    .get() as CapturedBookRow | undefined
  if (row) {
    row.isDuplicate = !!row.isDuplicate
  }
  return row
}

export function getQueue(): CapturedBookRow[] {
  const d = getDb()
  const rows = d
    .prepare(
      "SELECT * FROM captured_books WHERE status IN ('PENDING', 'PROCESSED') ORDER BY createdAt ASC"
    )
    .all() as CapturedBookRow[]
  return rows.map((r) => ({ ...r, isDuplicate: !!r.isDuplicate }))
}

export function getRecentCaptures(limit = 20): CapturedBookRow[] {
  const d = getDb()
  const rows = d
    .prepare('SELECT * FROM captured_books ORDER BY createdAt DESC LIMIT ?')
    .all(limit) as CapturedBookRow[]
  return rows.map((r) => ({ ...r, isDuplicate: !!r.isDuplicate }))
}

export function updateCapturedBook(
  id: number,
  data: Partial<{
    isbn: string | null
    title: string | null
    author: string | null
    publisher: string | null
    tagIds: string | null
    status: string
    isDuplicate: boolean
  }>
): CapturedBookRow | undefined {
  const d = getDb()
  const sets: string[] = []
  const params: Record<string, unknown> = { id }

  if (data.isbn !== undefined) {
    sets.push('isbn = @isbn')
    params.isbn = data.isbn
  }
  if (data.title !== undefined) {
    sets.push('title = @title')
    params.title = data.title
  }
  if (data.author !== undefined) {
    sets.push('author = @author')
    params.author = data.author
  }
  if (data.publisher !== undefined) {
    sets.push('publisher = @publisher')
    params.publisher = data.publisher
  }
  if (data.tagIds !== undefined) {
    sets.push('tagIds = @tagIds')
    params.tagIds = data.tagIds
  }
  if (data.status !== undefined) {
    sets.push('status = @status')
    params.status = data.status
  }
  if (data.isDuplicate !== undefined) {
    sets.push('isDuplicate = @isDuplicate')
    params.isDuplicate = data.isDuplicate ? 1 : 0
  }

  if (sets.length === 0) return getCapturedBookById(id)

  sets.push("updatedAt = datetime('now')")
  d.prepare(`UPDATE captured_books SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getCapturedBookById(id)
}

export function deleteCapturedBook(id: number): boolean {
  const d = getDb()
  const result = d.prepare('DELETE FROM captured_books WHERE id = ?').run(id)
  return result.changes > 0
}
