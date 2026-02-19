import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getBookInfoGoogleBooks, getBookInfoOpenLibrary, getBookInfoIndian } from './bookApi'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

describe('bookApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getBookInfoGoogleBooks', () => {
    it('should fetch book info successfully from Google Books API', async () => {
      const mockResponse = {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: 'Test Book',
              authors: ['John Doe'],
              publisher: 'Test Publisher'
            }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoGoogleBooks('9780123456789')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/books/v1/volumes?q=isbn:9780123456789'
      )
      expect(result).toEqual({
        title: 'Test Book',
        author: 'John Doe',
        publisher: 'Test Publisher'
      } as Response)
    })

    it('should handle missing author and publisher', async () => {
      const mockResponse = {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: 'Test Book'
            }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoGoogleBooks('9780123456789')

      expect(result).toEqual({
        title: 'Test Book',
        author: undefined,
        publisher: undefined
      } as Response)
    })

    it('should return null when no books found', async () => {
      const mockResponse = {
        totalItems: 0,
        items: []
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoGoogleBooks('9780000000000')

      expect(result).toBeNull()
    })

    it('should handle API errors gracefully', async () => {
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getBookInfoGoogleBooks('9780123456789')

      expect(result).toBeNull()
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching book info from Google Books API:',
        expect.any(Error)
      )

      mockConsoleError.mockRestore()
    })

    it('should handle missing title', async () => {
      const mockResponse = {
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              authors: ['John Doe']
            }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoGoogleBooks('9780123456789')

      expect(result).toEqual({
        title: '',
        author: 'John Doe',
        publisher: undefined
      } as Response)
    })
  })

  describe('getBookInfoOpenLibrary', () => {
    it('should fetch book info successfully from Open Library API', async () => {
      const mockResponse = {
        'ISBN:9780123456789': {
          title: 'Test Book',
          authors: [{ name: 'Jane Smith' }],
          publishers: [{ name: 'Open Library Press' }]
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoOpenLibrary('9780123456789')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://openlibrary.org/api/books?bibkeys=ISBN:9780123456789&format=json&jscmd=data'
      )
      expect(result).toEqual({
        title: 'Test Book',
        author: 'Jane Smith',
        publisher: 'Open Library Press'
      } as Response)
    })

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        'ISBN:9780123456789': {
          title: 'Minimal Book'
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoOpenLibrary('9780123456789')

      expect(result).toEqual({
        title: 'Minimal Book',
        author: undefined,
        publisher: undefined
      } as Response)
    })

    it('should return null when book not found', async () => {
      const mockResponse = {}

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoOpenLibrary('9780000000000')

      expect(result).toBeNull()
    })

    it('should handle API errors gracefully', async () => {
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getBookInfoOpenLibrary('9780123456789')

      expect(result).toBeNull()
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching book info from Open Library API:',
        expect.any(Error)
      )

      mockConsoleError.mockRestore()
    })

    it('should handle multiple authors correctly', async () => {
      const mockResponse = {
        'ISBN:9780123456789': {
          title: 'Multi-Author Book',
          authors: [{ name: 'Author One' }, { name: 'Author Two' }]
        }
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoOpenLibrary('9780123456789')

      expect(result).toEqual({
        title: 'Multi-Author Book',
        author: 'Author One', // Should only return first author
        publisher: undefined
      } as Response)
    })
  })

  describe('getBookInfoIndian', () => {
    it('should fetch book info successfully from Indian ISBN API', async () => {
      const mockResponse = {
        data: JSON.stringify([
          {
            title: 'Indian Book',
            Author: 'Raj Kumar',
            publisher: 'Indian Publishers'
          }
        ])
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoIndian('9788123456789')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://isbn.gov.in/Home/FillSearchText',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        } as Response)
      )
      expect(result).toEqual({
        title: 'Indian Book',
        author: 'Raj Kumar',
        publisher: 'Indian Publishers'
      } as Response)
    })

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        data: JSON.stringify([
          {
            title: 'Basic Book'
          }
        ])
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoIndian('9788123456789')

      expect(result).toEqual({
        title: 'Basic Book',
        author: undefined,
        publisher: undefined
      } as Response)
    })

    it('should return null when data is empty string "[]"', async () => {
      const mockResponse = {
        data: '[]'
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoIndian('9780000000000')

      expect(result).toBeNull()
    })

    it('should return null when data is null', async () => {
      const mockResponse = {
        data: null
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoIndian('9780000000000')

      expect(result).toBeNull()
    })

    it('should return null when parsed array is empty', async () => {
      const mockResponse = {
        data: '[]'
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      const result = await getBookInfoIndian('9780000000000')

      expect(result).toBeNull()
    })

    it('should handle API errors gracefully', async () => {
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getBookInfoIndian('9788123456789')

      expect(result).toBeNull()
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching book info from Open Library API:',
        expect.any(Error)
      )

      mockConsoleError.mockRestore()
    })

    it('should correctly construct request body', async () => {
      const mockResponse = {
        data: JSON.stringify([
          {
            title: 'Test Book',
            Author: 'Test Author',
            publisher: 'Test Publisher'
          }
        ])
      }

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse
      } as Response)

      await getBookInfoIndian('9788123456789')

      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body as string)

      expect(requestBody._obj.SearchValue).toBe('9788123456789')
      expect(requestBody._obj.Type).toBe('isbn_number_Nodash')
      expect(requestBody.data.columns).toHaveLength(10)
    })
  })
})
