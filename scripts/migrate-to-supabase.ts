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

  type UserRow = { email: string; name: string | null }
  type BookRow = {
    isbn: string
    title: string
    author: string | null
    publisher: string | null
    totalStock: number
    needsBarcodeSticker: number
    createdAt: string
    updatedAt: string
  }
  type TagRow = {
    id: number
    name: string
    description: string | null
    color: string | null
    createdAt: string
  }
  type BookTagRow = { bookIsbn: string; tagId: number; createdAt: string }
  type LoanRow = {
    id: number
    bookIsbn: string
    userEmail: string
    borrowedAt: string
    returnedAt: string | null
    dueDate: string | null
  }
  type CapturedBookRow = {
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
  }

  try {
    // 1. Migrate Users
    console.log('Migrating users...')
    const users = sqlite.prepare('SELECT * FROM users').all() as UserRow[]
    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          email: user.email,
          name: user.name
        }
      })
    }
    console.log(`Migrated ${users.length} users.`)

    // 2. Migrate Books
    console.log('Migrating books...')
    const books = sqlite.prepare('SELECT * FROM books').all() as BookRow[]
    for (const book of books) {
      await prisma.book.upsert({
        where: { isbn: book.isbn },
        update: {},
        create: {
          isbn: book.isbn,
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          totalStock: book.totalStock,
          needsBarcodeSticker: Boolean(book.needsBarcodeSticker),
          createdAt: new Date(book.createdAt),
          updatedAt: new Date(book.updatedAt)
        }
      })
    }
    console.log(`Migrated ${books.length} books.`)

    // 3. Migrate Tags
    console.log('Migrating tags...')
    const tags = sqlite.prepare('SELECT * FROM tags').all() as TagRow[]
    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { id: tag.id },
        update: {},
        create: {
          id: tag.id,
          name: tag.name,
          description: tag.description,
          color: tag.color,
          createdAt: new Date(tag.createdAt)
        }
      })
    }
    console.log(`Migrated ${tags.length} tags.`)

    // 4. Migrate BookTags
    console.log('Migrating book tags...')
    const bookTags = sqlite.prepare('SELECT * FROM book_tags').all() as BookTagRow[]
    for (const bt of bookTags) {
      await prisma.bookTag.upsert({
        where: {
          bookIsbn_tagId: {
            bookIsbn: bt.bookIsbn,
            tagId: bt.tagId
          }
        },
        update: {},
        create: {
          bookIsbn: bt.bookIsbn,
          tagId: bt.tagId,
          createdAt: new Date(bt.createdAt)
        }
      })
    }
    console.log(`Migrated ${bookTags.length} book tags.`)

    // 5. Migrate Loans
    console.log('Migrating loans...')
    const loans = sqlite.prepare('SELECT * FROM loans').all() as LoanRow[]
    for (const loan of loans) {
      await prisma.loan.upsert({
        where: { id: loan.id },
        update: {},
        create: {
          id: loan.id,
          bookIsbn: loan.bookIsbn,
          userEmail: loan.userEmail,
          borrowedAt: new Date(loan.borrowedAt),
          returnedAt: loan.returnedAt ? new Date(loan.returnedAt) : null,
          dueDate: loan.dueDate ? new Date(loan.dueDate) : null
        }
      })
    }
    console.log(`Migrated ${loans.length} loans.`)

    // 6. Migrate CapturedBooks
    console.log('Migrating captured books...')
    const capturedBooks = sqlite.prepare('SELECT * FROM captured_books').all() as CapturedBookRow[]
    for (const cb of capturedBooks) {
      await prisma.capturedBook.upsert({
        where: { id: cb.id },
        update: {},
        create: {
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
        }
      })
    }
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
