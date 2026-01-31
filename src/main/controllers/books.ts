import { prisma } from '../lib/prisma'

export const booksController = {
  getAll: async (
    page: number = 1,
    perPage: number = 25,
    orderBy: string,
    order: 'asc' | 'desc'
  ) => {
    const skip = (page - 1) * perPage
    const orderByClause = orderBy ? { [orderBy]: order } : {}
    return await prisma.book.findMany({
      skip,
      take: perPage,
      orderBy: orderByClause
    })
  },

  getById: async (isbn: string) => {
    return await prisma.book.findUnique({
      where: { isbn }
    })
  },

  create: async (data: { isbn: string; title: string }) => {
    return await prisma.book.create({
      data
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
  }
}

export type BooksController = typeof booksController
