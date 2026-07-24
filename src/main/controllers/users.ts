import { prisma } from '../lib/prisma'
import { Prisma } from '../../../generated/prisma/client'

export const usersController = {
  getAll: async (page: number = 1, perPage: number = 10, searchQuery?: string) => {
    const skip = (page - 1) * perPage
    const whereClause: Prisma.UserWhereInput = {}

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { loans: { where: { returnedAt: null } } }
          }
        },
        skip,
        take: perPage,
        orderBy: { email: 'asc' }
      }),
      prisma.user.count({ where: whereClause })
    ])

    return { users, total }
  },

  getByEmail: async (email: string) => {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        loans: {
          include: {
            book: {
              include: {
                bookTags: {
                  include: { tag: true }
                }
              }
            }
          },
          orderBy: { borrowedAt: 'desc' }
        }
      }
    })
  },

  updateName: async (email: string, name: string) => {
    return await prisma.user.update({
      where: { email },
      data: { name }
    })
  }
}

export type UsersController = typeof usersController
