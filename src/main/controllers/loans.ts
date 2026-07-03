import { prisma } from '../lib/prisma'
import { Loan } from '../../../generated/prisma/client'
import { getSettings } from '../lib/settings'
import { sendTransactionEmail } from '../lib/auth'
import {
  generateRentalEmailBody,
  generateReturnEmailBody,
  generateExtensionEmailBody
} from '../lib/emailTemplates'

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

  getUpcomingReturns: async () => {
    const loans = await prisma.loan.findMany({
      where: { returnedAt: null },
      include: { book: true, borrower: true },
      orderBy: { dueDate: 'asc' }
    })

    return { loans, total: loans.length }
  },

  getReturnsToday: async () => {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const loans = await prisma.loan.findMany({
      where: {
        dueDate: {
          lte: endOfDay
        }
      },
      include: { book: true, borrower: true },
      orderBy: { returnedAt: 'asc' } // active first (null returnedAt), then by returned date
    })

    return { loans, total: loans.length }
  },

  getPastLoans: async (page: number, limit: number, query: string) => {
    const skip = (page - 1) * limit
    const where = {
      returnedAt: { not: null },
      ...(query
        ? {
            OR: [
              { book: { title: { contains: query } } },
              { borrower: { name: { contains: query } } },
              { userEmail: { contains: query } },
              { bookIsbn: { contains: query } }
            ]
          }
        : {})
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: { book: true, borrower: true },
        orderBy: { returnedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.loan.count({ where })
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
    if (settings.enableEmails && data.userEmail && createdLoans.length > 0) {
      const subject = `[Library] Issuance Confirmation: ${createdLoans.length > 1 ? `${createdLoans.length} books` : 'a book'}`

      // Need to fetch book info to pass to the template
      const loansWithBooks = await prisma.loan.findMany({
        where: { id: { in: createdLoans.map((l) => l.id) } },
        include: { book: true }
      })
      const bookData = loansWithBooks.map((l) => ({
        title: l.book?.title || l.bookIsbn,
        isbn: l.bookIsbn
      }))

      const body = generateRentalEmailBody(data.userName || '', bookData, data.dueDate)

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
      const subject = `[Library] Book Returned: ${loan.book?.title || loan.bookIsbn}`
      const bookData = [{ title: loan.book?.title || loan.bookIsbn, isbn: loan.bookIsbn }]
      const body = generateReturnEmailBody(loan.borrower?.name || '', bookData)
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
      const subject = `[Library] Book Extension: ${loan.book?.title || loan.bookIsbn}`
      const bookData = [{ title: loan.book?.title || loan.bookIsbn, isbn: loan.bookIsbn }]
      const body = generateExtensionEmailBody(loan.borrower?.name || '', bookData, dueDate)
      sendTransactionEmail(loan.userEmail, subject, body).catch(console.error)
    }

    return loan
  },

  bulkReturnBooks: async (loanIds: number[]) => {
    // Fetch loans with relations before update to get user info and book info
    const loansToReturn = await prisma.loan.findMany({
      where: { id: { in: loanIds } },
      include: { book: true, borrower: true }
    })

    const result = await prisma.loan.updateMany({
      where: { id: { in: loanIds } },
      data: { returnedAt: new Date() }
    })

    const settings = getSettings()
    if (settings.enableEmails) {
      // Group loans by userEmail
      const loansByUser = loansToReturn.reduce(
        (acc, loan) => {
          if (!loan.userEmail) return acc
          if (!acc[loan.userEmail]) {
            acc[loan.userEmail] = { name: loan.borrower?.name || '', books: [] }
          }
          acc[loan.userEmail].books.push({
            title: loan.book?.title || loan.bookIsbn,
            isbn: loan.bookIsbn
          })
          return acc
        },
        {} as Record<string, { name: string; books: { title: string; isbn: string }[] }>
      )

      for (const [email, userLoans] of Object.entries(loansByUser)) {
        const subject = `[Library] Books Returned`
        const body = generateReturnEmailBody(userLoans.name, userLoans.books)
        sendTransactionEmail(email, subject, body).catch(console.error)
      }
    }

    return result
  },

  bulkExtendLoans: async (loanIds: number[], dueDate: Date) => {
    // Fetch loans with relations before update to get user info and book info
    const loansToExtend = await prisma.loan.findMany({
      where: { id: { in: loanIds } },
      include: { book: true, borrower: true }
    })

    const result = await prisma.loan.updateMany({
      where: { id: { in: loanIds } },
      data: { dueDate }
    })

    const settings = getSettings()
    if (settings.enableEmails) {
      // Group loans by userEmail
      const loansByUser = loansToExtend.reduce(
        (acc, loan) => {
          if (!loan.userEmail) return acc
          if (!acc[loan.userEmail]) {
            acc[loan.userEmail] = { name: loan.borrower?.name || '', books: [] }
          }
          acc[loan.userEmail].books.push({
            title: loan.book?.title || loan.bookIsbn,
            isbn: loan.bookIsbn
          })
          return acc
        },
        {} as Record<string, { name: string; books: { title: string; isbn: string }[] }>
      )

      for (const [email, userLoans] of Object.entries(loansByUser)) {
        const subject = `[Library] Books Extended`
        const body = generateExtensionEmailBody(userLoans.name, userLoans.books, dueDate)
        sendTransactionEmail(email, subject, body).catch(console.error)
      }
    }

    return result
  }
}

export type LoansController = typeof loansController
