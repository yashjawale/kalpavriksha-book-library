import { prisma } from '../lib/prisma'

export const loansController = {
  create: async (data: { bookIsbn: string; userEmail: string; dueDate?: Date | null }) => {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: data.userEmail }
    })

    if (!user) {
      throw new Error(`User with email ${data.userEmail} does not exist.`)
    }

    // Check if book exists and has stock
    const book = await prisma.book.findUnique({
      where: { isbn: data.bookIsbn },
      include: {
        loans: {
          where: { returnedAt: null }
        }
      }
    })

    if (!book) {
      throw new Error(`Book with ISBN ${data.bookIsbn} not found`)
    }

    const availableStock = book.totalStock - book.loans.length
    if (availableStock <= 0) {
      throw new Error('Book is out of stock')
    }

    // Create loan
    const loan = await prisma.loan.create({
      data: {
        bookIsbn: data.bookIsbn,
        userEmail: data.userEmail,
        dueDate: data.dueDate
      }
    })

    return loan
  },

  returnBook: async (loanId: number) => {
    return await prisma.loan.update({
      where: { id: loanId },
      data: { returnedAt: new Date() }
    })
  }
}
