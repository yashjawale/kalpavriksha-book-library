import 'dotenv/config'
import { createRequire } from 'module'
import nodemailer from 'nodemailer'
import { PrismaPg } from '@prisma/adapter-pg'
import { startOfDay, endOfDay, addDays, format } from 'date-fns'
import { generateDueReminderBody } from '../src/main/lib/emailTemplates'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../generated/prisma/index.js')

function parseArgs(): { date: Date; dryRun: boolean } {
  const args = process.argv.slice(2)
  let date: Date
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      date = new Date(args[++i])
    } else if (args[i] === '--dry-run') {
      dryRun = true
    }
  }

  if (process.env['REMINDER_DATE']) {
    date = new Date(process.env['REMINDER_DATE'])
  }

  if (process.env['REMINDER_DRY_RUN'] === 'true') {
    dryRun = true
  }

  if (!date) {
    date = addDays(new Date(), 1)
  }

  return { date, dryRun }
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    throw new Error('Missing SMTP credentials. Set SMTP_USER and SMTP_PASS environment variables.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
}

async function sendReminderEmail(to: string, subject: string, body: string): Promise<boolean> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"Kalpavriksha Library" <${from}>`,
    to,
    subject,
    text: body
  })

  return true
}

async function main() {
  const { date, dryRun } = parseArgs()

  console.log(`📋 Due date reminder check for: ${format(date, 'yyyy-MM-dd')}`)
  if (dryRun) {
    console.log('🔍 DRY RUN — no emails will be sent')
  }

  const connectionString = process.env.DATABASE_URL || ''
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  })
  const prisma = new PrismaClient({ adapter })

  try {
    const loans = await prisma.loan.findMany({
      where: {
        returnedAt: null,
        dueDate: {
          gte: startOfDay(date),
          lte: endOfDay(date)
        }
      },
      include: {
        book: true,
        borrower: true
      }
    })

    if (loans.length === 0) {
      console.log('✅ No loans due on this date.')
      return
    }

    const grouped = new Map<
      string,
      { name: string; email: string; books: { title: string; isbn: string }[] }
    >()

    for (const loan of loans) {
      const email = loan.userEmail
      if (!grouped.has(email)) {
        grouped.set(email, {
          name: loan.borrower?.name || '',
          email,
          books: []
        })
      }
      grouped.get(email)!.books.push({
        title: loan.book?.title || loan.bookIsbn,
        isbn: loan.bookIsbn
      })
    }

    const dueDate = endOfDay(date)

    console.log(`\n📚 ${loans.length} loan(s) due — ${grouped.size} recipient(s):\n`)

    for (const [email, entry] of grouped) {
      const subject = `[Library] Reminder: ${entry.books.length > 1 ? `${entry.books.length} books` : '1 book'} due tomorrow`
      const body = generateDueReminderBody(entry.name, entry.books, dueDate)

      console.log(`  → ${email} (${entry.name || 'no name'}): ${entry.books.length} book(s)`)
      for (const b of entry.books) {
        console.log(`      - ${b.title}`)
      }

      if (!dryRun) {
        try {
          await sendReminderEmail(email, subject, body)
          console.log(`     ✅ Sent`)
        } catch (err) {
          console.error(`     ❌ Failed: ${err instanceof Error ? err.message : err}`)
        }
      } else {
        console.log(`     📝 Would send (dry-run)`)
      }
      console.log('')
    }

    if (dryRun) {
      console.log('🔍 Dry run complete. Remove --dry-run to actually send.')
    } else {
      console.log('✅ Done.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
