import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

function resolveDatabaseUrl(): string {
  return process.env.DATABASE_URL || ''
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
  const adapter = new PrismaPg(
    {
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    },
    {
      onPoolError: (err) => console.error('Unexpected pool error:', err)
    }
  )
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
