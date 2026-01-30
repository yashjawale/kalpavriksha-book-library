import { prisma } from '../lib/prisma'

export const booksController = {
  getAll: async () => {
    return await prisma.book.findMany()
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
  }
}

export type BooksController = typeof booksController
