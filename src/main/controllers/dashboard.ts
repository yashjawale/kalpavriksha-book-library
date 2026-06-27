import { prisma } from '../lib/prisma'

export const dashboardController = {
  getStats: async () => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const [
      totalBooks,
      totalUsers,
      activeRentals,
      dueTodayTotal,
      dueTodayRemaining,
      rentalsToday,
      upcomingReturns,
      recentRentals
    ] = await Promise.all([
      prisma.book.count(),
      prisma.user.count(),
      prisma.loan.count({ where: { returnedAt: null } }),
      prisma.loan.count({
        where: {
          dueDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),
      prisma.loan.count({
        where: {
          dueDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          returnedAt: null
        }
      }),
      prisma.loan.count({
        where: {
          borrowedAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          returnedAt: null
        }
      }),
      prisma.loan.findMany({
        where: { returnedAt: null },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: { book: true, borrower: true }
      }),
      prisma.loan.findMany({
        where: { returnedAt: null },
        orderBy: { borrowedAt: 'desc' },
        take: 10,
        include: { book: true, borrower: true }
      })
    ])

    return {
      totalBooks,
      totalUsers,
      activeRentals,
      dueTodayTotal,
      dueTodayRemaining,
      rentalsToday,
      upcomingReturns,
      recentRentals
    }
  }
}

export type DashboardController = typeof dashboardController
