import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export async function getBookTitleGoogleBooks(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
    const data = await response.json()
    if (data.totalItems > 0) {
      return data.items[0].volumeInfo.title || null
    }
    return null
  } catch (error) {
    console.error('Error fetching book title from Google Books API:', error)
    return null
  }
}

export async function getBookTitleOpenLibrary(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    )
    const data = await response.json()
    const bookKey = `ISBN:${isbn}`
    if (data[bookKey]) {
      return data[bookKey].title || null
    }
    return null
  } catch (error) {
    console.error('Error fetching book title from Open Library API:', error)
    return null
  }
}

export async function fetchBookTitle(isbn: string): Promise<string | null> {
  let title = await getBookTitleGoogleBooks(isbn)
  if (title) {
    return title
  }
  title = await getBookTitleOpenLibrary(isbn)
  return title
}
