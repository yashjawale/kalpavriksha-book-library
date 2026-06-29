import path from 'path'
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

function toTitleCase(str: string | null | undefined): string | null {
  if (!str) return null
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function run() {
  const connectionString = resolveDatabaseUrl()
  const adapter = new PrismaBetterSqlite3({ url: connectionString })
  const prisma = new PrismaClient({ adapter })

  console.log('Title-casing books...')
  const books = await prisma.book.findMany()
  let booksUpdated = 0
  for (const book of books) {
    const title = toTitleCase(book.title)
    const author = toTitleCase(book.author)
    const publisher = toTitleCase(book.publisher)

    if (title !== book.title || author !== book.author || publisher !== book.publisher) {
      await prisma.book.update({
        where: { isbn: book.isbn },
        data: {
          title: title || book.title, // Title cannot be null
          author,
          publisher
        }
      })
      booksUpdated++
    }
  }
  console.log(`Updated ${booksUpdated} books.`)

  console.log('Title-casing tags...')
  const tags = await prisma.tag.findMany()
  let tagsUpdated = 0
  for (const tag of tags) {
    const name = toTitleCase(tag.name)
    if (name && name !== tag.name) {
      try {
        await prisma.tag.update({
          where: { id: tag.id },
          data: { name }
        })
        tagsUpdated++
      } catch (e) {
        // Tag name must be unique, might conflict if another tag already exists with title casing
        console.error(`Failed to update tag ${tag.name} to ${name}:`, e)
      }
    }
  }
  console.log(`Updated ${tagsUpdated} tags.`)

  await prisma.$disconnect()
}

run().catch(console.error)
