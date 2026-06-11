import { prisma } from '../lib/prisma'

export const loansController = {
  getAllActive: async () => {
    return await prisma.loan.findMany({
      where: { returnedAt: null },
      include: {
        book: true,
        borrower: true
      },
      orderBy: { borrowedAt: 'desc' }
    })
  },

  create: async (data: {
    bookIsbns: string[]
    userEmail: string
    userName?: string
    dueDate?: Date | null
  }) => {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: data.userEmail }
    })

    if (!user) {
      // Create user if not existent? The schema needs the user. If they selected from the directory,
      // they might not exist in the DB yet. The previous create checked and threw an error. Let's create instead to simplify.
      user = await prisma.user.create({
        data: { email: data.userEmail, name: data.userName || null }
      })
    }

    const createdLoans: any[] = []

    // Check books and create loans
    for (const isbn of data.bookIsbns) {
      const book = await prisma.book.findUnique({
        where: { isbn: isbn },
        include: {
          loans: {
            where: { returnedAt: null }
          }
        }
      })

      if (!book) {
        throw new Error(`Book with ISBN ${isbn} not found.`)
      }

      const availableStock = book.totalStock - book.loans.length
      if (availableStock <= 0) {
        throw new Error(`Book ${book.title || isbn} is out of stock.`)
      }

      const loan = await prisma.loan.create({
        data: {
          bookIsbn: isbn,
          userEmail: data.userEmail,
          dueDate: data.dueDate
        }
      })
      createdLoans.push(loan)
    }

    return createdLoans
  },

  returnBook: async (loanId: number) => {
    return await prisma.loan.update({
      where: { id: loanId },
      data: { returnedAt: new Date() }
    })
  },

  extendLoan: async (loanId: number, dueDate: Date) => {
    return await prisma.loan.update({
      where: { id: loanId },
      data: { dueDate }
    })
  }
}
