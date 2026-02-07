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

export async function getBookInfoIndian(
  isbn: string
): Promise<{ title: string; author?: string; publisher?: string } | null> {
  try {
    const response = await fetch(`https://isbn.gov.in/Home/FillSearchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: getJsonBodyIndiaISBN(isbn)
    })
    const result = await response.json()
    if (!result.data || result.data === '[]') {
      return null
    }

    // Parse the stringified JSON array within 'data'
    const parsedData = JSON.parse(result.data)

    // Safety check for empty array after parsing
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return null
    }

    const book = parsedData[0]

    // Extract and return the fields
    return {
      title: book.title,
      author: book.Author, // 'Author' is capitalized in API
      publisher: book.publisher
    }
  } catch (error) {
    console.error('Error fetching book info from Open Library API:', error)
    return null
  }
}

function getJsonBodyIndiaISBN(isbn: string): string {
  return JSON.stringify({
    data: {
      draw: 1,
      columns: [
        {
          data: 'Index1',
          name: 'Index1',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'title',
          name: 'title',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'isbn_number',
          name: 'isbn_number',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'productform',
          name: 'productform',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'language',
          name: 'language',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'applicant_type',
          name: 'applicant_type',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'publisher',
          name: 'publisher',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'Inprint',
          name: 'Inprint',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'Author',
          name: 'Author',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        },
        {
          data: 'publicationdate',
          name: 'publicationdate',
          searchable: true,
          orderable: true,
          search: {
            value: '',
            regex: false
          }
        }
      ],
      order: [
        {
          column: 0,
          dir: 'asc'
        }
      ],
      start: 0,
      length: 50,
      search: {
        value: '',
        regex: false
      }
    },
    _obj: {
      Type: 'isbn_number_Nodash',
      SearchValue: isbn,
      ViewReport: 1
    }
  })
}
