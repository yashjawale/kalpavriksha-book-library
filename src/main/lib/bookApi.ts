export async function getBookInfoGoogleBooks(
  isbn: string
): Promise<{ title: string; author?: string; publisher?: string } | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
    const data = await response.json()
    if (data.totalItems > 0) {
      const volumeInfo = data.items[0].volumeInfo
      return {
        title: volumeInfo.title || '',
        author: volumeInfo.authors?.[0] || undefined,
        publisher: volumeInfo.publisher || undefined
      }
    }
    return null
  } catch (error) {
    console.error('Error fetching book info from Google Books API:', error)
    return null
  }
}

export async function getBookInfoOpenLibrary(
  isbn: string
): Promise<{ title: string; author?: string; publisher?: string } | null> {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    )
    const data = await response.json()
    const bookKey = `ISBN:${isbn}`
    if (data[bookKey]) {
      const bookData = data[bookKey]
      return {
        title: bookData.title || '',
        author: bookData.authors?.[0]?.name || undefined,
        publisher: bookData.publishers?.[0]?.name || undefined
      }
    }
    return null
  } catch (error) {
    console.error('Error fetching book info from Open Library API:', error)
    return null
  }
}
