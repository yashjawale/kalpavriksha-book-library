import { prisma, isDbConfigured } from './prisma'
import { getPendingCapturedBook, updateCapturedBook } from './captureDb'
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
let wakeup: (() => void) | null = null
let pendingWakeups = 0

function createWakeupPromise(): Promise<void> {
  if (pendingWakeups > 0) {
    pendingWakeups--
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    wakeup = resolve
  })
}

export function wakeUpCaptureProcessor() {
  const w = wakeup
  if (w) {
    wakeup = null
    pendingWakeups = 0
    w()
  } else if (!processing) {
    processNext()
  }
}

async function processNext() {
  if (processing) return
  processing = true
  try {
    const pending = getPendingCapturedBook()

    if (!pending) {
      processing = false
      await createWakeupPromise()
      processNext()
      return
    }

    console.log(`Processing captured book ID: ${pending.id}`)

    let isbn: string | null = pending.isbn

    if (!isbn && pending.backImage && fs.existsSync(pending.backImage)) {
      try {
        const readerOptions = {
          tryHarder: true,
          formats: ['EAN_13', 'UPC_A', 'UPC_E', 'EAN_8']
        }

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
      if (isDbConfigured) {
        try {
          const existing = await prisma.book.findUnique({ where: { isbn } })
          if (existing) {
            isDuplicate = true
            title = existing.title
            author = existing.author || ''
            publisher = existing.publisher || ''
          }
        } catch {
          console.warn('Capture processor: Supabase lookup failed, skipping duplicate check')
        }
      }

      if (!isDuplicate) {
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

    updateCapturedBook(pending.id, {
      isbn,
      title,
      author,
      publisher,
      isDuplicate,
      status: 'PROCESSED'
    })
    console.log(`Finished processing book ID: ${pending.id}`)

    processing = false
    processNext()
  } catch (error) {
    console.error('Error in capture processor:', error)
    processing = false
  }
}

export function startCaptureProcessor() {
  processNext()
}
