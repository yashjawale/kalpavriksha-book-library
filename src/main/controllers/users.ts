import { prisma } from '../lib/prisma'

export const usersController = {
  getAll: async () => {
    return await prisma.user.findMany({
      include: {
        _count: {
          select: { loans: true }
        }
      }
    })
  },

  getByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        loans: {
          include: {
            book: true
          },
          orderBy: { borrowedAt: 'desc' }
        }
      }
    })
  }
}
