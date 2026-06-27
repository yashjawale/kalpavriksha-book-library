import path from 'path'
import Database from 'better-sqlite3'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client'

function resolveDatabaseUrl(): string {
  let connectionString = process.env.DATABASE_URL || 'file:./dev.db'
  if (connectionString.startsWith('file:./') || connectionString.startsWith('file:../')) {
    const dbPath = connectionString.replace('file:', '')
    const resolvedPath = path.resolve(process.cwd(), dbPath)
    connectionString = `file:${resolvedPath}`
  } else if (!connectionString.startsWith('file:')) {
    const fallback = path.resolve(process.cwd(), 'dev.db')
    connectionString = `file:${fallback}`
  }
  return connectionString
}

async function run() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error(
      'Please provide the path to the DB to merge: npx tsx scripts/merge-db.ts <path-to-db>'
    )
    process.exit(1)
  }

  const otherDbPath = path.resolve(process.cwd(), args[0])
  console.log(`Merging DB from: ${otherDbPath}`)

  const connectionString = resolveDatabaseUrl()
  const dbPath = connectionString.replace('file:', '')
  const db = new Database(dbPath)
  // @ts-expect-error - Prisma adapter types might be mismatched
  const adapter = new PrismaBetterSqlite3(db)
  const prisma = new PrismaClient({ adapter })

  const otherDb = new Database(otherDbPath, { readonly: true })

  // 1. Merge tags
  console.log('Merging tags...')
  const otherTags = otherDb.prepare('SELECT * FROM tags').all() as {
    id: number
    name: string
    description: string | null
    color: string | null
    createdAt: string
  }[]
  const tagIdMap = new Map<number, number>() // other DB tag ID -> current DB tag ID

  const currentTags = await prisma.tag.findMany()

  for (const otherTag of otherTags) {
    const existingTag = currentTags.find(
      (t) => t.name.toLowerCase() === otherTag.name.toLowerCase()
    )
    if (existingTag) {
      tagIdMap.set(otherTag.id, existingTag.id)
    } else {
      const newTag = await prisma.tag.create({
        data: {
          name: otherTag.name,
          description: otherTag.description,
          color: otherTag.color,
          createdAt: new Date(otherTag.createdAt)
        }
      })
      tagIdMap.set(otherTag.id, newTag.id)
    }
  }
  console.log('Tags merged.')

  // 2. Merge books
  console.log('Merging books...')
  const otherBooks = otherDb.prepare('SELECT * FROM books').all() as {
    isbn: string
    title: string
    author: string
    publisher: string
    totalStock: number
    needsBarcodeSticker: number
    createdAt: string
    updatedAt: string
  }[]

  for (const otherBook of otherBooks) {
    const existingBook = await prisma.book.findUnique({
      where: { isbn: otherBook.isbn }
    })

    if (existingBook) {
      await prisma.book.update({
        where: { isbn: otherBook.isbn },
        data: {
          totalStock: existingBook.totalStock + otherBook.totalStock
        }
      })
    } else {
      await prisma.book.create({
        data: {
          isbn: otherBook.isbn,
          title: otherBook.title,
          author: otherBook.author,
          publisher: otherBook.publisher,
          totalStock: otherBook.totalStock,
          needsBarcodeSticker: otherBook.needsBarcodeSticker === 1,
          createdAt: new Date(otherBook.createdAt),
          updatedAt: new Date(otherBook.updatedAt)
        }
      })
    }
  }
  console.log('Books merged.')

  // 3. Merge book_tags
  console.log('Merging book tags...')
  const otherBookTags = otherDb.prepare('SELECT * FROM book_tags').all() as {
    bookIsbn: string
    tagId: number
    createdAt: string
  }[]

  for (const otherBookTag of otherBookTags) {
    const targetTagId = tagIdMap.get(otherBookTag.tagId)
    if (!targetTagId) continue

    const existingLink = await prisma.bookTag.findUnique({
      where: {
        bookIsbn_tagId: {
          bookIsbn: otherBookTag.bookIsbn,
          tagId: targetTagId
        }
      }
    })

    if (!existingLink) {
      try {
        await prisma.bookTag.create({
          data: {
            bookIsbn: otherBookTag.bookIsbn,
            tagId: targetTagId,
            createdAt: new Date(otherBookTag.createdAt)
          }
        })
      } catch (e) {
        // Book might have been skipped or something
        console.error(`Failed to link book ${otherBookTag.bookIsbn} with tag ${targetTagId}`, e)
      }
    }
  }
  console.log('Book tags merged.')

  await prisma.$disconnect()
  otherDb.close()
  console.log('Merge complete!')
}

run().catch(console.error)
