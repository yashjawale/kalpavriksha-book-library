import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

function generateKVBId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  return `KVB-${year}${month}${day}${milliseconds}`
}

dotenv.config()

async function importCSV() {
  const args = process.argv.slice(2)
  const csvFilePath = args[0]

  if (!csvFilePath) {
    console.error('Please provide a path to the CSV file as the first argument.')
    console.error('Usage: npx tsx scripts/import-csv-books.ts <path-to-csv>')
    process.exit(1)
  }

  const absolutePath = path.resolve(process.cwd(), csvFilePath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  const supabaseUrl = process.env.DATABASE_URL
  if (!supabaseUrl) {
    console.error('DATABASE_URL environment variable is required to connect to the database.')
    process.exit(1)
  }

  const adapter = new PrismaPg({ connectionString: supabaseUrl })
  const prisma = new PrismaClient({ adapter })

  console.log(`Reading CSV from ${absolutePath}...`)
  const csvContent = fs.readFileSync(absolutePath, 'utf8')

  const results = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  })

  if (results.errors.length > 0) {
    console.error('Errors parsing CSV:', results.errors)
    process.exit(1)
  }

  const rows = results.data as Array<Record<string, string>>
  console.log(`Found ${rows.length} rows to process.`)

  let successCount = 0
  let errorCount = 0

  for (const row of rows) {
    try {
      const title = row['title'] || row['Title'] || row['TITLE']
      const author = row['author'] || row['Author'] || row['AUTHOR'] || null
      const publisher = row['publisher'] || row['Publisher'] || row['PUBLISHER'] || null
      const quantityStr = row['quantity'] || row['Quantity'] || row['QUANTITY'] || '1'

      if (!title) {
        console.warn(`Skipping row with missing title:`, row)
        errorCount++
        continue
      }

      // If there's an ISBN column, use it, otherwise generate a KVB ID
      let isbn = row['isbn'] || row['Isbn'] || row['ISBN']
      if (!isbn) {
        isbn = generateKVBId()
      }

      const totalStock = parseInt(quantityStr, 10) || 1

      await prisma.book.upsert({
        where: { isbn },
        update: {
          totalStock: { increment: totalStock }
        },
        create: {
          isbn,
          title,
          author,
          publisher,
          totalStock,
          needsBarcodeSticker: true // Assuming bulk imported books need stickers
        }
      })
      successCount++
    } catch (error) {
      console.error(`Failed to process row:`, row, error)
      errorCount++
    }
  }

  console.log('--- Import Complete ---')
  console.log(`Successfully imported/updated: ${successCount} books`)
  if (errorCount > 0) {
    console.log(`Failed to process: ${errorCount} books`)
  }

  await prisma.$disconnect()
}

importCSV()
