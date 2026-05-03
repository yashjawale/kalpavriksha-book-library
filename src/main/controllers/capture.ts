import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

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

      const capturedBook = await prisma.capturedBook.create({
        data: {
          frontImage: frontPath,
          backImage: backPath,
          tagIds: tagIds && tagIds.length > 0 ? JSON.stringify(tagIds) : null,
          status: 'PENDING'
        }
      })

      return { success: true, data: capturedBook }
    } catch (error) {
      console.error('Error saving captured images:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  getQueue: async () => {
    return await prisma.capturedBook.findMany({
      where: { status: { in: ['PENDING', 'PROCESSED'] } },
      orderBy: { createdAt: 'asc' }
    })
  },

  getRecentCaptures: async () => {
    return await prisma.capturedBook.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    })
  },

  approve: async (
    id: number,
    data: { isbn: string; title: string; author?: string; publisher?: string; tagIds?: number[] },
    mode: 'INCREMENT' | 'NEW_ENTRY' = 'INCREMENT'
  ) => {
    try {
      const captured = await prisma.capturedBook.findUnique({ where: { id } })
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
          for (const tagId of tagsToSave) {
            await prisma.bookTag.upsert({
              where: {
                bookIsbn_tagId: { bookIsbn: finalIsbn, tagId }
              },
              update: {},
              create: {
                bookIsbn: finalIsbn,
                tagId
              }
            })
          }
        } catch (e) {
          console.error('Failed to add tags', e)
        }
      }

      // Cleanup
      if (fs.existsSync(captured.frontImage)) fs.unlinkSync(captured.frontImage)
      if (fs.existsSync(captured.backImage)) fs.unlinkSync(captured.backImage)
      await prisma.capturedBook.delete({ where: { id } })

      return { success: true }
    } catch (error) {
      console.error('Error approving captured book:', error)
      return { success: false, error: (error as Error).message }
    }
  },

  reject: async (id: number) => {
    try {
      const captured = await prisma.capturedBook.findUnique({ where: { id } })
      if (!captured) return { success: false, error: 'Not found' }

      // Cleanup
      if (fs.existsSync(captured.frontImage)) fs.unlinkSync(captured.frontImage)
      if (fs.existsSync(captured.backImage)) fs.unlinkSync(captured.backImage)
      await prisma.capturedBook.delete({ where: { id } })

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
