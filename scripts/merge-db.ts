import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'

function generateKVBId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  return `KVB-${year}${month}${day}${milliseconds}`
}

function openDb(filePath: string, readonly = false): Database.Database {
  const resolved = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(resolved)) {
    console.error(`Database not found: ${resolved}`)
    process.exit(1)
  }
  return new Database(resolved, { readonly })
}

function run() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/merge-db.ts <target.db> <source.db>')
    process.exit(1)
  }

  const targetPath = path.resolve(process.cwd(), args[0])
  const sourcePath = path.resolve(process.cwd(), args[1])

  console.log(`Target: ${targetPath}`)
  console.log(`Source: ${sourcePath}`)

  const target = openDb(targetPath)
  const source = openDb(sourcePath, true)

  try {
    // Wrap target operations in a transaction for speed and atomicity
    target.pragma('journal_mode = WAL')
    target.pragma('foreign_keys = ON')

    const mergeTransaction = target.transaction(() => {
      // 1. Merge tags
      console.log('Merging tags...')
      const sourceTags = source.prepare('SELECT * FROM tags').all() as {
        id: number
        name: string
        description: string | null
        color: string | null
        createdAt: string
      }[]
      const tagIdMap = new Map<number, number>()

      const targetTags = target.prepare('SELECT * FROM tags').all() as {
        id: number
        name: string
      }[]

      for (const sourceTag of sourceTags) {
        const existing = targetTags.find(
          (t) => t.name.toLowerCase() === sourceTag.name.toLowerCase()
        )
        if (existing) {
          tagIdMap.set(sourceTag.id, existing.id)
        } else {
          const info = target
            .prepare(
              'INSERT INTO tags (name, description, color, createdAt) VALUES (?, ?, ?, ?) RETURNING id'
            )
            .get(sourceTag.name, sourceTag.description, sourceTag.color, sourceTag.createdAt) as {
            id: number
          }
          tagIdMap.set(sourceTag.id, info.id)
          targetTags.push({ id: info.id, name: sourceTag.name })
        }
      }
      console.log(`  ${sourceTags.length} tags processed.`)

      // 2. Merge books
      console.log('Merging books...')
      const sourceBooks = source.prepare('SELECT * FROM books').all() as {
        isbn: string
        title: string
        author: string | null
        publisher: string | null
        totalStock: number
        needsBarcodeSticker: number
        createdAt: string
        updatedAt: string
      }[]

      const isbnMap = new Map<string, string>()

      const insertBook = target.prepare(`
        INSERT INTO books (isbn, title, author, publisher, totalStock, needsBarcodeSticker, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const updateBookStock = target.prepare(
        'UPDATE books SET totalStock = totalStock + ? WHERE isbn = ?'
      )
      for (const sourceBook of sourceBooks) {
        const existing = target
          .prepare('SELECT * FROM books WHERE isbn = ?')
          .get(sourceBook.isbn) as
          | { isbn: string; title: string; author: string | null; publisher: string | null }
          | undefined

        if (existing) {
          const isKvb = sourceBook.isbn.startsWith('KVB-')

          if (!isKvb) {
            updateBookStock.run(sourceBook.totalStock, sourceBook.isbn)
          } else {
            const titleMatch = (sourceBook.title ?? '') === (existing.title ?? '')
            const authorMatch = (sourceBook.author ?? '') === (existing.author ?? '')
            const publisherMatch = (sourceBook.publisher ?? '') === (existing.publisher ?? '')

            if (titleMatch && authorMatch && publisherMatch) {
              updateBookStock.run(sourceBook.totalStock, sourceBook.isbn)
            } else {
              let newIsbn: string
              do {
                newIsbn = generateKVBId()
              } while (target.prepare('SELECT 1 FROM books WHERE isbn = ?').get(newIsbn))

              isbnMap.set(sourceBook.isbn, newIsbn)
              console.log(`  KVB conflict: "${sourceBook.isbn}" -> reassigned as "${newIsbn}"`)
              insertBook.run(
                newIsbn,
                sourceBook.title,
                sourceBook.author,
                sourceBook.publisher,
                sourceBook.totalStock,
                sourceBook.needsBarcodeSticker,
                sourceBook.createdAt,
                sourceBook.updatedAt
              )
            }
          }
        } else {
          insertBook.run(
            sourceBook.isbn,
            sourceBook.title,
            sourceBook.author,
            sourceBook.publisher,
            sourceBook.totalStock,
            sourceBook.needsBarcodeSticker,
            sourceBook.createdAt,
            sourceBook.updatedAt
          )
        }
      }
      console.log(`  ${sourceBooks.length} books processed.`)

      // 3. Merge book_tags
      console.log('Merging book tags...')
      const sourceBookTags = source.prepare('SELECT * FROM book_tags').all() as {
        bookIsbn: string
        tagId: number
        createdAt: string
      }[]

      const insertBookTag = target.prepare(
        'INSERT OR IGNORE INTO book_tags (bookIsbn, tagId, createdAt) VALUES (?, ?, ?)'
      )

      for (const bt of sourceBookTags) {
        const targetTagId = tagIdMap.get(bt.tagId)
        if (!targetTagId) continue
        const bookIsbn = isbnMap.get(bt.bookIsbn) ?? bt.bookIsbn
        insertBookTag.run(bookIsbn, targetTagId, bt.createdAt)
      }
      console.log(`  ${sourceBookTags.length} book tags processed.`)
    })

    mergeTransaction()
    console.log('Merge complete!')
  } finally {
    target.close()
    source.close()
  }
}

run()
