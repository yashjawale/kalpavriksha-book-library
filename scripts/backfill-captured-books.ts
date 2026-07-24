import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import dotenv from 'dotenv'
import {
  getBookInfoGoogleBooks,
  getBookInfoOpenLibrary,
  getBookInfoIndian
} from '../src/main/lib/bookApi'

dotenv.config()

type CapturedBookRow = {
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

type AiResult = {
  title: string
  author: string
  publisher: string
}

const AI_PROMPT =
  'Analyze this book cover image. Extract the Title, Author, and Publisher. If any field is missing or illegible, return \'\' (empty string). Respond *only* in the following JSON format:\n{\n"title": "...",\n"author": "...",\n"publisher": "..."\n} \n Ignore the blue technical publications book in the back by Soudamini Patil & Pranjali Deshpande if its present,there should won\'t be any book from technical publications. focus only on the book in the front. \n If the book is in hindi/marathi, give the output in hinglish i.e. same wordds but using english alphabets. \n If the book has information about issue date or volume, mention that in title too. \n If there is just a spread out hand in the image, return title as HAAND'

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

function openDb(filePath: string): Database.Database {
  const resolved = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(resolved)) {
    console.error(`Database not found: ${resolved}`)
    process.exit(1)
  }
  return new Database(resolved)
}

async function run() {
  const args = process.argv.slice(2)

  const flags = new Set(args.filter((a) => a.startsWith('--')))
  const isDryRun = flags.has('--dry-run') || flags.has('-n')
  const aiOnly = flags.has('--ai-only')
  const aiEnabled = aiOnly || flags.has('--ai')

  // Positional args: <captures.db> [books.db]
  const positional = args.filter((a) => !a.startsWith('--'))
  if (positional.length === 0) {
    console.error(
      'Usage: npx tsx scripts/backfill-captured-books.ts <captures.db> [books.db] [options]'
    )
    console.error('Options:')
    console.error('  --dry-run    Preview changes without writing')
    console.error('  --ai         Use AI as fallback when APIs return no data')
    console.error('  --ai-only    Use AI only, skip API lookups')
    process.exit(1)
  }

  const capturesDb = openDb(positional[0])
  let booksDb: Database.Database | null = null
  if (positional[1]) {
    booksDb = openDb(positional[1])
    console.log(`Books DB: ${path.resolve(process.cwd(), positional[1])}`)
  }

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
    const captured = capturesDb
      .prepare('SELECT * FROM captured_books ORDER BY createdAt ASC')
      .all() as CapturedBookRow[]

    if (captured.length === 0) {
      console.log('No captured books found.')
      return
    }

    console.log(`Found ${captured.length} captured book(s).`)
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'WRITE'}`)
    console.log(`AI: ${aiEnabled ? (aiOnly ? 'ONLY' : 'FALLBACK') : 'DISABLED'}\n`)

    const updateStmt = capturesDb.prepare(`
      UPDATE captured_books
      SET title = ?, author = ?, publisher = ?, isDuplicate = ?, status = 'PROCESSED', isbn = ?,
          updatedAt = datetime('now')
      WHERE id = ?
    `)

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
          let existing: { title: string; author: string | null; publisher: string | null } | null =
            null

          if (booksDb) {
            const row = booksDb
              .prepare('SELECT title, author, publisher FROM books WHERE isbn = ?')
              .get(isbn) as
              | { title: string; author: string | null; publisher: string | null }
              | undefined
            if (row) existing = row
          }

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

        if (isDryRun) {
          console.log(
            `- ID ${record.id} -> title="${title}", author="${author}", publisher="${publisher}", isDuplicate=${isDuplicate}`
          )
        } else {
          updateStmt.run(
            title,
            author,
            publisher,
            isDuplicate ? 1 : 0,
            hasIsbn ? isbn : null,
            record.id
          )
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
    capturesDb.close()
    if (booksDb) booksDb.close()
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
