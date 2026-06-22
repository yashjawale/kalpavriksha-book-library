import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client'
import {
  getBookInfoGoogleBooks,
  getBookInfoOpenLibrary,
  getBookInfoIndian
} from '../src/main/lib/bookApi'

type BackfillUpdate = {
  title: string
  author: string
  publisher: string
  isDuplicate: boolean
  status: 'PROCESSED'
  isbn?: string
}

type AiResult = {
  title: string
  author: string
  publisher: string
}

const AI_PROMPT =
  'Analyze this book cover image. Extract the Title, Author, and Publisher. If any field is missing or illegible, return \'\' (empty string). Respond *only* in the following JSON format:\n{\n"title": "...",\n"author": "...",\n"publisher": "..."\n} \n Ignore the blue technical publications book in the back by Soudamini Patil & Pranjali Deshpande if its present,there should won\'t be any book from technical publications. focus only on the book in the front. \n If the book is in hindi/marathi, give the output in hinglish i.e. same wordds but using english alphabets. \n If the book has information about issue date or volume, mention that in title too. \n If there is just a spread out hand in the image, return title as HAAND'

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

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.jpeg':
    case '.jpg':
    default:
      return 'image/jpeg'
  }
}

function extractJsonObject(content: string): AiResult | null {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const jsonText = content.slice(start, end + 1)
  try {
    const parsed = JSON.parse(jsonText) as AiResult
    if (!parsed || typeof parsed !== 'object') return null
    return {
      title: String(parsed.title || '').trim(),
      author: String(parsed.author || '').trim(),
      publisher: String(parsed.publisher || '').trim()
    }
  } catch {
    return null
  }
}

async function getBookInfoFromAi(imagePath: string): Promise<AiResult | null> {
  const baseUrl = (process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1').replace(/\/$/, '')
  const apiKey = process.env.LMSTUDIO_API_KEY || 'lmstudio'
  const model = process.env.LMSTUDIO_MODEL || 'local-model'

  if (!fs.existsSync(imagePath)) {
    return null
  }

  const buffer = fs.readFileSync(imagePath)
  const mimeType = getMimeType(imagePath)
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: AI_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`AI request failed: ${response.status} ${response.statusText} - ${text}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content || ''
  return extractJsonObject(content)
}

async function run() {
  const args = new Set(process.argv.slice(2))
  const isDryRun = args.has('--dry-run') || args.has('-n')
  const aiOnly = args.has('--ai-only')
  const aiEnabled = aiOnly || args.has('--ai')

  const connectionString = resolveDatabaseUrl()
  const adapter = new PrismaBetterSqlite3({ url: connectionString })
  const prisma = new PrismaClient({ adapter })

  let processed = 0
  let updated = 0
  let skipped = 0
  let failures = 0
  let apiFilled = 0
  let aiFilled = 0

  let shouldStop = false
  process.on('SIGINT', () => {
    if (shouldStop) {
      console.log('\nForce exiting...')
      console.log(`Processed: ${processed}`)
      console.log(`Updated: ${updated}`)
      console.log(`Skipped: ${skipped}`)
      console.log(`Failures: ${failures}`)
      console.log(`Filled via APIs: ${apiFilled}`)
      console.log(`Filled via AI: ${aiFilled}`)
      process.exit(1)
    }
    shouldStop = true
    console.log('\nReceived Ctrl+C. Finishing current item and stopping...')
  })

  try {
    const captured = await prisma.capturedBook.findMany({
      orderBy: { createdAt: 'asc' }
    })

    if (captured.length === 0) {
      console.log('No captured books found.')
      return
    }

    console.log(`Found ${captured.length} captured book(s).`)
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'WRITE'}`)
    console.log(`AI: ${aiEnabled ? (aiOnly ? 'ONLY' : 'FALLBACK') : 'DISABLED'}\n`)

    for (const record of captured) {
      processed += 1

      const hasTitle = !!record.title && record.title.trim().length > 0
      if (hasTitle) {
        skipped += 1
        console.log(`- Skipping ID ${record.id}: title already present.`)
        if (shouldStop) break
        continue
      }

      const isbn = (record.isbn || '').trim()
      const hasIsbn = isbn.length > 0
      if (!hasIsbn && !aiEnabled) {
        skipped += 1
        console.log(`- Skipping ID ${record.id}: empty ISBN and AI disabled.`)
        if (shouldStop) break
        continue
      }

      try {
        let title = record.title || ''
        let author = record.author || ''
        let publisher = record.publisher || ''
        let isDuplicate = record.isDuplicate

        if (hasIsbn) {
          const existing = await prisma.book.findUnique({ where: { isbn } })

          if (existing) {
            isDuplicate = true
            title = existing.title
            author = existing.author || ''
            publisher = existing.publisher || ''
          } else if (!aiOnly) {
            const info = await getBookInfo(isbn)
            if (info) {
              title = info.title || ''
              author = info.author || ''
              publisher = info.publisher || ''
              apiFilled += 1
            }
          }
        }

        if (aiEnabled && (!title || title.trim().length === 0)) {
          const aiInfo = await getBookInfoFromAi(record.frontImage)
          if (aiInfo) {
            title = aiInfo.title || ''
            author = aiInfo.author || ''
            publisher = aiInfo.publisher || ''
            aiFilled += 1
          }
        }

        const updateData: BackfillUpdate = {
          title,
          author,
          publisher,
          isDuplicate,
          status: 'PROCESSED'
        }

        if (hasIsbn) {
          updateData.isbn = isbn
        }

        if (isDryRun) {
          console.log(
            `- ID ${record.id} -> title="${title}", author="${author}", publisher="${publisher}", isDuplicate=${isDuplicate}`
          )
        } else {
          await prisma.capturedBook.update({
            where: { id: record.id },
            data: updateData
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

      if (shouldStop) break
    }
  } finally {
    await prisma.$disconnect()
  }

  console.log('\nDone.')
  console.log(`Processed: ${processed}`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failures: ${failures}`)
  console.log(`Filled via APIs: ${apiFilled}`)
  console.log(`Filled via AI: ${aiFilled}`)
}

run().catch((error) => {
  console.error('Backfill script failed:', error)
  process.exit(1)
})
