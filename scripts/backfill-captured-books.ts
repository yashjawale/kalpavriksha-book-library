import path from 'path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client'
import {
  getBookInfoGoogleBooks,
  getBookInfoOpenLibrary,
  getBookInfoIndian
} from '../src/main/lib/bookApi'

type BackfillResult = {
  id: number
  isbn: string
  title: string
  author: string
  publisher: string
  isDuplicate: boolean
  status: 'PROCESSED'
}

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

async function getBookInfo(isbn: string) {
  return (
    (await getBookInfoGoogleBooks(isbn)) ||
    (await getBookInfoOpenLibrary(isbn)) ||
    (await getBookInfoIndian(isbn))
  )
}

async function run() {
  const args = new Set(process.argv.slice(2))
  const isDryRun = args.has('--dry-run') || args.has('-n')

  const connectionString = resolveDatabaseUrl()
  const adapter = new PrismaBetterSqlite3({ url: connectionString })
  const prisma = new PrismaClient({ adapter })

  let processed = 0
  let updated = 0
  let skipped = 0
  let failures = 0

  try {
    const captured = await prisma.capturedBook.findMany({
      where: {
        isbn: { not: null }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (captured.length === 0) {
      console.log('No captured books with ISBN found.')
      return
    }

    console.log(`Found ${captured.length} captured book(s) with ISBN.`)
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'WRITE'}\n`)

    for (const record of captured) {
      processed += 1

      const isbn = (record.isbn || '').trim()
      if (!isbn) {
        skipped += 1
        console.log(`- Skipping ID ${record.id}: empty ISBN.`)
        continue
      }

      try {
        let title = record.title || ''
        let author = record.author || ''
        let publisher = record.publisher || ''
        let isDuplicate = record.isDuplicate

        const existing = await prisma.book.findUnique({ where: { isbn } })

        if (existing) {
          isDuplicate = true
          title = existing.title
          author = existing.author || ''
          publisher = existing.publisher || ''
        } else {
          const info = await getBookInfo(isbn)
          if (info) {
            title = info.title || ''
            author = info.author || ''
            publisher = info.publisher || ''
          }
        }

        const result: BackfillResult = {
          id: record.id,
          isbn,
          title,
          author,
          publisher,
          isDuplicate,
          status: 'PROCESSED'
        }

        if (isDryRun) {
          console.log(
            `- ID ${record.id} -> title="${title}", author="${author}", publisher="${publisher}", isDuplicate=${isDuplicate}`
          )
        } else {
          await prisma.capturedBook.update({
            where: { id: record.id },
            data: result
          })
          updated += 1
          console.log(
            `- Updated ID ${record.id} -> title="${title}", author="${author}", publisher="${publisher}", isDuplicate=${isDuplicate}`
          )
        }
      } catch (error) {
        failures += 1
        console.error(`- Failed ID ${record.id}:`, error)
      }
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log('\nDone.')
  console.log(`Processed: ${processed}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failures: ${failures}`)
}

run().catch((error) => {
  console.error('Backfill script failed:', error)
  process.exit(1)
})
