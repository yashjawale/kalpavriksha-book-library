import { prisma } from './prisma'
import { getBookInfoGoogleBooks, getBookInfoOpenLibrary, getBookInfoIndian } from './bookApi'
import * as fs from 'fs'
import { readBarcodesFromImageFile, setZXingModuleOverrides } from 'zxing-wasm/reader'
import path from 'path'

try {
  const wasmPath = path.join(
    __dirname,
    '../../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm'
  )
  const wasmBinary = fs.readFileSync(wasmPath)
  setZXingModuleOverrides({
    wasmBinary: wasmBinary.buffer
  })
} catch (e) {
  console.error('Failed to load zxing wasm binary:', e)
}

let processing = false

export function startCaptureProcessor() {
  // Run every 2 seconds
  setInterval(async () => {
    if (processing) return
    processing = true

    try {
      const pending = await prisma.capturedBook.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' }
      })

      if (!pending) {
        processing = false
        return
      }

      console.log(`Processing captured book ID: ${pending.id}`)

      let isbn: string | null = null

      // Try reading barcode from back image
      if (fs.existsSync(pending.backImage)) {
        try {
          const readerOptions = {
            tryHarder: true,
            formats: ['EAN_13', 'UPC_A', 'UPC_E', 'EAN_8']
          }

          // @ts-ignore - The types might not exactly match
          const buffer = fs.readFileSync(pending.backImage)
          const blob = new Blob([buffer])
          const results = await readBarcodesFromImageFile(
            blob,
            readerOptions as Parameters<typeof readBarcodesFromImageFile>[1]
          )
          if (results && results.length > 0) {
            isbn = results[0].text
            console.log(`Barcode found: ${isbn}`)
          }
        } catch (e) {
          console.error('Error reading barcode:', e)
        }
      }

      let title = ''
      let author = ''
      let publisher = ''

      let isDuplicate = false

      if (isbn) {
        // Check local database first
        const existing = await prisma.book.findUnique({ where: { isbn } })

        if (existing) {
          isDuplicate = true
          title = existing.title
          author = existing.author || ''
          publisher = existing.publisher || ''
        } else {
          // Try to fetch metadata
          const info =
            (await getBookInfoGoogleBooks(isbn)) ||
            (await getBookInfoOpenLibrary(isbn)) ||
            (await getBookInfoIndian(isbn))

          if (info) {
            title = info.title
            author = info.author || ''
            publisher = info.publisher || ''
          }
        }
      }

      // Update record
      await prisma.capturedBook.update({
        where: { id: pending.id },
        data: {
          isbn,
          title,
          author,
          publisher,
          isDuplicate,
          status: 'PROCESSED'
        }
      })
      console.log(`Finished processing book ID: ${pending.id}`)
    } catch (error) {
      console.error('Error in capture processor:', error)
    } finally {
      processing = false
    }
  }, 2000)
}
