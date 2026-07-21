import fs from 'fs'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { PrismaClient } from '../generated/prisma/index.js'
import path from 'path'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config()

async function migrate() {
  const supabaseUrl = process.env.DATABASE_URL
  if (!supabaseUrl) {
    console.error('DATABASE_URL environment variable is required to migrate to Supabase.')
    process.exit(1)
  }

  console.log('Connecting to Supabase (Postgres)...')
  const adapter = new PrismaPg({ connectionString: supabaseUrl })
  const prisma = new PrismaClient({ adapter })

  // Open local SQLite DB
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  const localDbPath = path.resolve(scriptDir, '..', 'prisma', 'dev.db')
  console.log(localDbPath)
  if (!fs.existsSync(localDbPath)) {
    console.log(`Local ${localDbPath} not found. Nothing to migrate.`)
    return
  }

  let sqlite: Database.Database
  try {
    sqlite = new Database(localDbPath, { fileMustExist: true })
  } catch (error) {
    console.error(`Failed to open ${localDbPath}:`, error)
    return
  }

  try {
    // 1. Migrate Users
    console.log('Migrating users...')
    const users = sqlite.prepare('SELECT * FROM users').all() as {
      email: string
      name: string | null
    }[]
    await prisma.user.createMany({ data: users })
    console.log(`Migrated ${users.length} users.`)

    // 2. Migrate Books
    console.log('Migrating books...')
    const books = sqlite.prepare('SELECT * FROM books').all() as {
      isbn: string
      title: string
      author: string | null
      publisher: string | null
      totalStock: number
      needsBarcodeSticker: number
      createdAt: string
      updatedAt: string
    }[]
    await prisma.book.createMany({
      data: books.map((b) => ({
        isbn: b.isbn,
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        totalStock: b.totalStock,
        needsBarcodeSticker: Boolean(b.needsBarcodeSticker),
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt)
      }))
    })
    console.log(`Migrated ${books.length} books.`)

    // 3. Migrate Tags
    console.log('Migrating tags...')
    const tags = sqlite.prepare('SELECT * FROM tags').all() as {
      id: number
      name: string
      description: string | null
      color: string | null
      createdAt: string
    }[]
    await prisma.tag.createMany({
      data: tags.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        createdAt: new Date(t.createdAt)
      }))
    })
    console.log(`Migrated ${tags.length} tags.`)

    // 4. Migrate BookTags
    console.log('Migrating book tags...')
    const bookTags = sqlite.prepare('SELECT * FROM book_tags').all() as {
      bookIsbn: string
      tagId: number
      createdAt: string
    }[]
    await prisma.bookTag.createMany({
      data: bookTags.map((bt) => ({
        bookIsbn: bt.bookIsbn,
        tagId: bt.tagId,
        createdAt: new Date(bt.createdAt)
      }))
    })
    console.log(`Migrated ${bookTags.length} book tags.`)

    // 5. Migrate Loans
    console.log('Migrating loans...')
    const loans = sqlite.prepare('SELECT * FROM loans').all() as {
      id: number
      bookIsbn: string
      userEmail: string
      borrowedAt: string
      returnedAt: string | null
      dueDate: string | null
    }[]
    await prisma.loan.createMany({
      data: loans.map((l) => ({
        id: l.id,
        bookIsbn: l.bookIsbn,
        userEmail: l.userEmail,
        borrowedAt: new Date(l.borrowedAt),
        returnedAt: l.returnedAt ? new Date(l.returnedAt) : null,
        dueDate: l.dueDate ? new Date(l.dueDate) : null
      }))
    })
    console.log(`Migrated ${loans.length} loans.`)

    // 6. Migrate CapturedBooks
    console.log('Migrating captured books...')
    const capturedBooks = sqlite.prepare('SELECT * FROM captured_books').all() as {
      id: number
      frontImage: string
      backImage: string | null
      isbn: string | null
      title: string | null
      author: string | null
      publisher: string | null
      tagIds: string | null
      status: string
      isDuplicate: number
      createdAt: string
      updatedAt: string
    }[]
    await prisma.capturedBook.createMany({
      data: capturedBooks.map((cb) => ({
        id: cb.id,
        frontImage: cb.frontImage,
        backImage: cb.backImage,
        isbn: cb.isbn,
        title: cb.title,
        author: cb.author,
        publisher: cb.publisher,
        tagIds: cb.tagIds,
        status: cb.status,
        isDuplicate: Boolean(cb.isDuplicate),
        createdAt: new Date(cb.createdAt),
        updatedAt: new Date(cb.updatedAt)
      }))
    })
    console.log(`Migrated ${capturedBooks.length} captured books.`)

    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Error during migration:', err)
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

migrate()
