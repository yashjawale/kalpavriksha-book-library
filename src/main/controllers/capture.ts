import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { prisma } from '../lib/prisma'
import {
  createCapturedBook,
  getCapturedBookById,
  getQueue,
  getRecentCaptures,
  deleteCapturedBook
} from '../lib/captureDb'
import crypto from 'crypto'
import { wakeUpCaptureProcessor } from '../lib/captureProcessor'

export const captureController = {
  saveImages: async (frontBase64: string, backBase64: string, tagIds?: number[]) => {
    try {
      const userDataPath = app.getPath('userData')
      const capturesDir = join(userDataPath, 'captures')
      if (!fs.existsSync(capturesDir)) {
        fs.mkdirSync(capturesDir, { recursive: true })
      }

      const id = crypto.randomUUID()
      const frontPath = join(capturesDir, `${id}_front.jpg`)
      const backPath = join(capturesDir, `${id}_back.jpg`)

      // Assuming base64 format is "data:image/jpeg;base64,/9j/4AAQ..."
      const frontBuffer = Buffer.from(frontBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      const backBuffer = Buffer.from(backBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')

      fs.writeFileSync(frontPath, frontBuffer)
      fs.writeFileSync(backPath, backBuffer)

      const capturedBook = createCapturedBook({
        frontImage: frontPath,
        backImage: backPath,
        tagIds: tagIds && tagIds.length > 0 ? JSON.stringify(tagIds) : null,
        status: 'PENDING'
      })

      wakeUpCaptureProcessor()

      return { success: true, data: capturedBook }
    } catch (error) {
      console.error('Error saving captured images:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  // Quick Capture: saves only the front image. ISBN may be pre-scanned via barcode scanner.
  saveFrontImage: async (frontBase64: string, isbn?: string | null, tagIds?: number[]) => {
    try {
      const userDataPath = app.getPath('userData')
      const capturesDir = join(userDataPath, 'captures')
      if (!fs.existsSync(capturesDir)) {
        fs.mkdirSync(capturesDir, { recursive: true })
      }

      const id = crypto.randomUUID()
      const frontPath = join(capturesDir, `${id}_front.jpg`)

      const frontBuffer = Buffer.from(frontBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      fs.writeFileSync(frontPath, frontBuffer)

      const capturedBook = createCapturedBook({
        frontImage: frontPath,
        backImage: '',
        isbn: isbn || null,
        tagIds: tagIds && tagIds.length > 0 ? JSON.stringify(tagIds) : null,
        status: 'PENDING'
      })

      wakeUpCaptureProcessor()

      return { success: true, data: capturedBook }
    } catch (error) {
      console.error('Error saving front image:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  getQueue: async () => {
    return getQueue()
  },

  getRecentCaptures: async () => {
    return getRecentCaptures(20)
  },

  approve: async (
    id: number,
    data: { isbn: string; title: string; author?: string; publisher?: string; tagIds?: number[] },
    mode: 'INCREMENT' | 'NEW_ENTRY' = 'INCREMENT'
  ) => {
    try {
      const captured = getCapturedBookById(id)
      if (!captured) return { success: false, error: 'Not found' }

      let finalIsbn = data.isbn

      if (mode === 'NEW_ENTRY') {
        finalIsbn = `KVB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
        await prisma.book.create({
          data: {
            isbn: finalIsbn,
            title: data.title,
            author: data.author,
            publisher: data.publisher,
            totalStock: 1,
            needsBarcodeSticker: true
          }
        })
      } else {
        const existingBook = await prisma.book.findUnique({ where: { isbn: data.isbn } })

        if (existingBook) {
          // Just update stock
          await prisma.book.update({
            where: { isbn: data.isbn },
            data: {
              totalStock: { increment: 1 }
            }
          })
        } else {
          await prisma.book.create({
            data: {
              isbn: finalIsbn,
              title: data.title,
              author: data.author,
              publisher: data.publisher,
              totalStock: 1,
              needsBarcodeSticker: false
            }
          })
        }
      }

      // Handle tags
      const tagsToSave = data.tagIds || (captured.tagIds ? JSON.parse(captured.tagIds) : [])
      if (tagsToSave.length > 0) {
        try {
          await prisma.bookTag.createMany({
            data: tagsToSave.map((tagId) => ({ bookIsbn: finalIsbn, tagId })),
            skipDuplicates: true
          })
        } catch (e) {
          console.error('Failed to add tags', e)
        }
      }

      // Cleanup
      if (fs.existsSync(captured.frontImage)) fs.unlinkSync(captured.frontImage)
      if (captured.backImage && fs.existsSync(captured.backImage)) fs.unlinkSync(captured.backImage)
      deleteCapturedBook(id)

      return { success: true }
    } catch (error) {
      console.error('Error approving captured book:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  reject: async (id: number) => {
    try {
      const captured = getCapturedBookById(id)
      if (!captured) return { success: false, error: 'Not found' }

      // Cleanup
      if (fs.existsSync(captured.frontImage)) fs.unlinkSync(captured.frontImage)
      if (captured.backImage && fs.existsSync(captured.backImage)) fs.unlinkSync(captured.backImage)
      deleteCapturedBook(id)

      return { success: true }
    } catch (error) {
      console.error('Error rejecting captured book:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  getImageBase64: async (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const file = fs.readFileSync(filePath)
        return `data:image/jpeg;base64,${file.toString('base64')}`
      }
      return null
    } catch (error) {
      console.error('Error reading image:', error)
      return null
    }
  }
}

export type CaptureController = typeof captureController
