import { prisma } from '../lib/prisma'
import { Prisma } from '../../../generated/prisma/client'

export const booksController = {
  getAll: async (
    page: number = 1,
    perPage: number = 25,
    orderBy: string = 'updatedAt',
    order: 'asc' | 'desc' = 'desc',
    searchQuery?: string,
    needsBarcodeSticker?: boolean,
    tagIds?: number[]
  ) => {
    const skip = (page - 1) * perPage
    const orderByClause = orderBy ? { [orderBy]: order } : {}
    const whereClause: Prisma.BookWhereInput = {}

    if (searchQuery) {
      whereClause.OR = [
        { isbn: { contains: searchQuery, mode: 'insensitive' } },
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { author: { contains: searchQuery, mode: 'insensitive' } },
        { publisher: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }

    if (needsBarcodeSticker !== undefined) {
      whereClause.needsBarcodeSticker = needsBarcodeSticker
    }

    if (tagIds && tagIds.length > 0) {
      whereClause.bookTags = {
        some: { tagId: { in: tagIds } }
      }
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        skip,
        take: perPage,
        where: whereClause,
        orderBy: orderByClause,
        include: {
          bookTags: { include: { tag: true } },
          loans: { where: { returnedAt: null }, select: { id: true } }
        }
      }),
      prisma.book.count({ where: whereClause })
    ])

    return { books, total }
  },

  getById: async (isbn: string) => {
    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        },
        loans: {
          where: { returnedAt: null },
          select: { id: true }
        }
      }
    })
  },

  getBookDetails: async (isbn: string) => {
    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        },
        loans: {
          include: { borrower: true },
          orderBy: { borrowedAt: 'desc' }
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

  updateDetails: async (
    isbn: string,
    details: { title: string; author?: string; publisher?: string; tagIds?: number[] }
  ) => {
    return await prisma.$transaction(async (tx) => {
      if (details.tagIds !== undefined) {
        await tx.bookTag.deleteMany({
          where: { bookIsbn: isbn }
        })

        if (details.tagIds.length > 0) {
          await tx.bookTag.createMany({
            data: details.tagIds.map((tagId) => ({ bookIsbn: isbn, tagId }))
          })
        }
      }

      return await tx.book.update({
        where: { isbn },
        data: {
          title: details.title,
          author: details.author,
          publisher: details.publisher
        }
      })
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
  },

  bulkDelete: async (isbns: string[]) => {
    return await prisma.book.deleteMany({
      where: {
        isbn: {
          in: isbns
        }
      }
    })
  },

  bulkUpdateTags: async (isbns: string[], tagIds: number[]) => {
    return await prisma.$transaction(async (tx) => {
      await tx.bookTag.deleteMany({
        where: { bookIsbn: { in: isbns } }
      })

      if (tagIds.length > 0) {
        const data = isbns.flatMap((isbn) => tagIds.map((tagId) => ({ bookIsbn: isbn, tagId })))
        await tx.bookTag.createMany({ data })
      }

      return await tx.book.findMany({
        where: { isbn: { in: isbns } },
        include: {
          bookTags: { include: { tag: true } }
        }
      })
    })
  },

  bulkAddTag: async (isbns: string[], tagIds: number[]) => {
    const data = isbns.flatMap((isbn) => tagIds.map((tagId) => ({ bookIsbn: isbn, tagId })))

    await prisma.bookTag.createMany({
      data,
      skipDuplicates: true
    })

    return await prisma.book.findMany({
      where: { isbn: { in: isbns } },
      include: {
        bookTags: { include: { tag: true } }
      }
    })
  },

  bulkRemoveTag: async (isbns: string[], tagIds: number[]) => {
    // For each book, remove the specified tags if they exist
    await prisma.bookTag.deleteMany({
      where: {
        bookIsbn: {
          in: isbns
        },
        tagId: {
          in: tagIds
        }
      }
    })

    return await prisma.book.findMany({
      where: {
        isbn: {
          in: isbns
        }
      },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  }
}

export type BooksController = typeof booksController
