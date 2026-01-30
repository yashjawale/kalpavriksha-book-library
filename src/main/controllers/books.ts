import { prisma } from '../lib/prisma'

export const getAllBooks = async () => {
  return await prisma.book.findMany()
}

export const getBookById = async (isbn: string) => {
  return await prisma.book.findUnique({
    where: { isbn }
  })
}

export const createBook = async (data: { isbn: string; title: string }) => {
  return await prisma.book.create({
    data
  })
}

export const updateBookStockCount = async (isbn: string, stockCount: number) => {
  return await prisma.book.update({
    where: { isbn },
    data: { totalStock: stockCount }
  })
}
