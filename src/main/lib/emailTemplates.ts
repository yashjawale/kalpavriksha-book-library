export function generateRentalEmailBody(
  userName: string,
  books: { title: string; isbn: string }[],
  dueDate?: Date | null
): string {
  const booksList = books.map((b) => `- ${b.title} (ISBN: ${b.isbn})`).join('\n')
  const dueDateStr = dueDate
    ? `\n\nPlease ensure they are returned by ${new Date(dueDate).toLocaleDateString()}.`
    : ''

  return `Hello ${userName || ''},

You have successfully rented the following book(s) from the library:

${booksList}${dueDateStr}

Thank you,
Kalpavriksha Book Library`
}

export function generateReturnEmailBody(
  userName: string,
  books: { title: string; isbn: string }[]
): string {
  const booksList = books.map((b) => `- ${b.title} (ISBN: ${b.isbn})`).join('\n')

  return `Hello ${userName || ''},

We have successfully received your returned book(s):

${booksList}

Thank you,
Kalpavriksha Book Library`
}

export function generateExtensionEmailBody(
  userName: string,
  books: { title: string; isbn: string }[],
  dueDate: Date
): string {
  const booksList = books.map((b) => `- ${b.title} (ISBN: ${b.isbn})`).join('\n')

  return `Hello ${userName || ''},

Your rental for the following book(s) has been extended:

${booksList}

The new due date is ${new Date(dueDate).toLocaleDateString()}.

Thank you,
Kalpavriksha Book Library`
}
