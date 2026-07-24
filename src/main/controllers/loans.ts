import { prisma } from '../lib/prisma'
import { Prisma } from '../../../generated/prisma/client'
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
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const loans = await prisma.loan.findMany({
      where: {
        dueDate: {
          lte: endOfDay
        },
        OR: [{ returnedAt: null }, { returnedAt: { gte: startOfDay } }]
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
              { book: { title: { contains: query, mode: 'insensitive' } } },
              { borrower: { name: { contains: query, mode: 'insensitive' } } },
              { userEmail: { contains: query, mode: 'insensitive' } },
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
    const createdLoans = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: data.userEmail }
      })

      if (!user) {
        user = await tx.user.create({
          data: { email: data.userEmail, name: data.userName || null }
        })
      }

      const books = await tx.book.findMany({
        where: { isbn: { in: data.bookIsbns } },
        include: {
          loans: {
            where: { returnedAt: null },
            select: { id: true }
          }
        }
      })

      const bookMap = new Map<string, (typeof books)[number]>(books.map((b) => [b.isbn, b]))

      for (const isbn of data.bookIsbns) {
        const book = bookMap.get(isbn)
        if (!book) {
          throw new Error(`Book with ISBN ${isbn} not found.`)
        }
        if (book.totalStock - book.loans.length <= 0) {
          throw new Error(`Book ${book.title || isbn} is out of stock.`)
        }
      }

      await tx.loan.createMany({
        data: data.bookIsbns.map((isbn) => ({
          bookIsbn: isbn,
          userEmail: data.userEmail,
          dueDate: data.dueDate
        }))
      })

      const result = await tx.loan.findMany({
        where: {
          bookIsbn: { in: data.bookIsbns },
          userEmail: data.userEmail,
          borrowedAt: { gte: new Date(Date.now() - 5000) }
        },
        orderBy: { borrowedAt: 'desc' },
        take: data.bookIsbns.length
      })

      return { loans: result, bookMap }
    })

    const { loans, bookMap } = createdLoans

    const settings = getSettings()
    if (settings.enableEmails && data.userEmail && loans.length > 0) {
      const subject = `[Library] Issuance Confirmation: ${loans.length > 1 ? `${loans.length} books` : 'a book'}`
      const bookData = data.bookIsbns.map((isbn) => ({
        title: bookMap.get(isbn)?.title || isbn,
        isbn
      }))
      const body = generateRentalEmailBody(data.userName || '', bookData, data.dueDate)
      sendTransactionEmail(data.userEmail, subject, body).catch(console.error)
    }

    return loans
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
        const { name, books } = userLoans as {
          name: string
          books: { title: string; isbn: string }[]
        }
        const subject = `[Library] Books Returned`
        const body = generateReturnEmailBody(name, books)
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
        const { name, books } = userLoans as {
          name: string
          books: { title: string; isbn: string }[]
        }
        const subject = `[Library] Books Extended`
        const body = generateExtensionEmailBody(name, books, dueDate)
        sendTransactionEmail(email, subject, body).catch(console.error)
      }
    }

    return result
  }
}

export type LoansController = typeof loansController
