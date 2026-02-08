import { prisma } from '../lib/prisma'

export const booksController = {
  getAll: async (
    page: number = 1,
    perPage: number = 25,
    orderBy: string = 'updatedAt',
    order: 'asc' | 'desc' = 'desc',
    isbnPrefix?: string,
    needsBarcodeSticker?: boolean
  ) => {
    const skip = (page - 1) * perPage
    const orderByClause = orderBy ? { [orderBy]: order } : {}
    const whereClause: { isbn?: { startsWith: string }; needsBarcodeSticker?: boolean } = {}

    if (isbnPrefix) {
      whereClause.isbn = { startsWith: isbnPrefix }
    }

    if (needsBarcodeSticker !== undefined) {
      whereClause.needsBarcodeSticker = needsBarcodeSticker
    }

    return await prisma.book.findMany({
      skip,
      take: perPage,
      where: whereClause,
      orderBy: orderByClause,
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  },

  getById: async (isbn: string) => {
    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  },

  create: async (data: {
    isbn: string
    title: string
    author?: string
    publisher?: string
    totalStock?: number
    needsBarcodeSticker?: boolean
    tagIds?: number[]
  }) => {
    return await prisma.book.create({
      data: {
        isbn: data.isbn,
        title: data.title,
        author: data.author,
        publisher: data.publisher,
        totalStock: data.totalStock ?? 1,
        needsBarcodeSticker: data.needsBarcodeSticker ?? false,
        bookTags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({
                tagId
              }))
            }
          : undefined
      },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  },

  updateStock: async (isbn: string, stockCount: number) => {
    return await prisma.book.update({
      where: { isbn },
      data: { totalStock: stockCount }
    })
  },

  incrementStockByOne: async (isbn: string) => {
    return await prisma.book.update({
      where: { isbn },
      data: {
        totalStock: {
          increment: 1
        }
      }
    })
  },

  decrementStockByOne: async (isbn: string) => {
    return await prisma.book.update({
      where: { isbn },
      data: {
        totalStock: {
          decrement: 1
        }
      }
    })
  },

  delete: async (isbn: string) => {
    return await prisma.book.delete({
      where: { isbn }
    })
  }
}

export type BooksController = typeof booksController
