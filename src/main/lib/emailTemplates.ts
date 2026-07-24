import { format } from 'date-fns'

export function generateRentalEmailBody(
  userName: string,
  books: { title: string; isbn: string }[],
  dueDate?: Date | null
): string {
  const booksList = books.map((b) => `- ${b.title}`).join('\n')
  const dueDateStr = dueDate
    ? `\n\nPlease ensure they are returned by ${format(new Date(dueDate), 'dd/MM/yy')}.`
    : ''

  return `Hello ${userName || ''},

You have successfully issued the following book(s) from the library:

${booksList}${dueDateStr}

Thank you,
Kalpavriksha Library`
}

export function generateReturnEmailBody(
  userName: string,
  books: { title: string; isbn: string }[]
): string {
  const booksList = books.map((b) => `- ${b.title}`).join('\n')

  return `Hello ${userName || ''},

We have successfully received your returned book(s):

${booksList}

Thank you,
Kalpavriksha Library`
}

export function generateDueReminderBody(
  userName: string,
  books: { title: string; isbn: string }[],
  dueDate: Date
): string {
  const booksList = books.map((b) => `- ${b.title}`).join('\n')

  return `Hello ${userName || ''},

This is a reminder that the following book(s) are due for return tomorrow (${format(new Date(dueDate), 'dd/MM/yy')}):

${booksList}

Please return them to the library on time.

Thank you,
Kalpavriksha Library`
}

export function generateExtensionEmailBody(
  userName: string,
  books: { title: string; isbn: string }[],
  dueDate: Date
): string {
  const booksList = books.map((b) => `- ${b.title}`).join('\n')

  return `Hello ${userName || ''},

Your issuance for the following book(s) has been extended:

${booksList}

The new due date is ${format(new Date(dueDate), 'dd/MM/yy')}.

Thank you,
Kalpavriksha Library`
}
