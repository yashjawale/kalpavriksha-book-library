import { prisma } from '../lib/prisma'
import { Prisma, Loan } from '../../../generated/prisma/client'
import { getSettings } from '../lib/settings'
import { sendTransactionEmail } from '../lib/auth'

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

  getUpcomingReturns: async (page: number = 1, perPage: number = 25, searchQuery?: string) => {
    const skip = (page - 1) * perPage
    const whereClause: Prisma.LoanWhereInput = { returnedAt: null }

    if (searchQuery) {
      whereClause.OR = [
        { book: { title: { contains: searchQuery } } },
        { borrower: { name: { contains: searchQuery } } },
        { borrower: { email: { contains: searchQuery } } }
      ]
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where: whereClause,
        include: { book: true, borrower: true },
        orderBy: { dueDate: 'asc' },
        skip,
        take: perPage
      }),
      prisma.loan.count({ where: whereClause })
    ])

    return { loans, total }
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

    const createdLoans: Loan[] = []

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

    const settings = getSettings()
    if (settings.enableEmails && data.userEmail) {
      const bookTitles = createdLoans.length > 1 ? `${createdLoans.length} books` : `a book`
      const dueDateStr = data.dueDate ? ` by ${new Date(data.dueDate).toLocaleDateString()}` : ''
      const subject = `Library Rental Confirmation: ${bookTitles}`
      const body = `Hello ${data.userName || ''},\n\nYou have successfully rented ${bookTitles} from the library. Please ensure they are returned${dueDateStr}.\n\nThank you,\nKalpavriksha Book Library`

      // Fire and forget
      sendTransactionEmail(data.userEmail, subject, body).catch(console.error)
    }

    return createdLoans
  },

  returnBook: async (loanId: number) => {
    const loan = await prisma.loan.update({
      where: { id: loanId },
      data: { returnedAt: new Date() },
      include: { book: true, borrower: true }
    })

    const settings = getSettings()
    if (settings.enableEmails && loan.userEmail) {
      const subject = `Library Book Returned: ${loan.book?.title || loan.bookIsbn}`
      const body = `Hello ${loan.borrower?.name || ''},\n\nWe have successfully received your returned book: "${loan.book?.title || loan.bookIsbn}".\n\nThank you,\nKalpavriksha Book Library`
      sendTransactionEmail(loan.userEmail, subject, body).catch(console.error)
    }

    return loan
  },

  extendLoan: async (loanId: number, dueDate: Date) => {
    const loan = await prisma.loan.update({
      where: { id: loanId },
      data: { dueDate },
      include: { book: true, borrower: true }
    })

    const settings = getSettings()
    if (settings.enableEmails && loan.userEmail) {
      const subject = `Library Book Extension: ${loan.book?.title || loan.bookIsbn}`
      const body = `Hello ${loan.borrower?.name || ''},\n\nYour rental for "${loan.book?.title || loan.bookIsbn}" has been extended. The new due date is ${new Date(dueDate).toLocaleDateString()}.\n\nThank you,\nKalpavriksha Book Library`
      sendTransactionEmail(loan.userEmail, subject, body).catch(console.error)
    }

    return loan
  },

  bulkReturnBooks: async (loanIds: number[]) => {
    return await prisma.loan.updateMany({
      where: { id: { in: loanIds } },
      data: { returnedAt: new Date() }
    })
  },

  bulkExtendLoans: async (loanIds: number[], dueDate: Date) => {
    return await prisma.loan.updateMany({
      where: { id: { in: loanIds } },
      data: { dueDate }
    })
  }
}

export type LoansController = typeof loansController
