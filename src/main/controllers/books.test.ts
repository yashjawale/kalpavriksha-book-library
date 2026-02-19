import { describe, it, expect, vi, beforeEach } from 'vitest'
import { booksController } from './books'

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    book: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    bookTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}))

// Get the mocked prisma
const { prisma: mockPrisma } = await import('../lib/prisma')

describe('booksController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch all books with default parameters', async () => {
      const mockBooks = [
        {
          isbn: '9780123456789',
          title: 'Test Book',
          author: 'Test Author',
          publisher: 'Test Publisher',
          totalStock: 5,
          needsBarcodeSticker: false,
          bookTags: []
        }
      ]
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.getAll()

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 25,
        where: {},
        orderBy: { updatedAt: 'desc' },
        include: {
          bookTags: {
            include: {
              tag: true
            }
          }
        }
      })
      expect(result).toEqual(mockBooks)
    })

    it('should fetch books with custom pagination', async () => {
      mockPrisma.book.findMany.mockResolvedValue([])

      await booksController.getAll(2, 10)

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      )
    })

    it('should filter by ISBN prefix', async () => {
      mockPrisma.book.findMany.mockResolvedValue([])

      await booksController.getAll(1, 25, 'updatedAt', 'desc', '978')

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isbn: { startsWith: '978' } }
        })
      )
    })

    it('should filter by needsBarcodeSticker', async () => {
      mockPrisma.book.findMany.mockResolvedValue([])

      await booksController.getAll(1, 25, 'updatedAt', 'desc', undefined, true)

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { needsBarcodeSticker: true }
        })
      )
    })

    it('should support custom sorting', async () => {
      mockPrisma.book.findMany.mockResolvedValue([])

      await booksController.getAll(1, 25, 'title', 'asc')

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' }
        })
      )
    })
  })

  describe('getById', () => {
    it('should fetch a book by ISBN', async () => {
      const mockBook = {
        isbn: '9780123456789',
        title: 'Test Book',
        author: 'Test Author',
        publisher: 'Test Publisher',
        totalStock: 5,
        needsBarcodeSticker: false,
        bookTags: []
      }
      mockPrisma.book.findUnique.mockResolvedValue(mockBook)

      const result = await booksController.getById('9780123456789')

      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { isbn: '9780123456789' },
        include: {
          bookTags: {
            include: {
              tag: true
            }
          }
        }
      })
      expect(result).toEqual(mockBook)
    })

    it('should return null for non-existent book', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null)

      const result = await booksController.getById('invalid-isbn')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a book with minimal data', async () => {
      const bookData = {
        isbn: '9780123456789',
        title: 'New Book'
      }
      const mockCreatedBook = {
        ...bookData,
        author: null,
        publisher: null,
        totalStock: 1,
        needsBarcodeSticker: false,
        bookTags: []
      }
      mockPrisma.book.create.mockResolvedValue(mockCreatedBook)

      const result = await booksController.create(bookData)

      expect(mockPrisma.book.create).toHaveBeenCalledWith({
        data: {
          isbn: bookData.isbn,
          title: bookData.title,
          author: undefined,
          publisher: undefined,
          totalStock: 1,
          needsBarcodeSticker: false,
          bookTags: undefined
        },
        include: {
          bookTags: {
            include: {
              tag: true
            }
          }
        }
      })
      expect(result).toEqual(mockCreatedBook)
    })

    it('should create a book with all fields', async () => {
      const bookData = {
        isbn: '9780123456789',
        title: 'Complete Book',
        author: 'John Doe',
        publisher: 'Test Publisher',
        totalStock: 10,
        needsBarcodeSticker: true,
        tagIds: [1, 2]
      }
      const mockCreatedBook = { ...bookData, bookTags: [] }
      mockPrisma.book.create.mockResolvedValue(mockCreatedBook)

      const result = await booksController.create(bookData)

      expect(mockPrisma.book.create).toHaveBeenCalledWith({
        data: {
          isbn: bookData.isbn,
          title: bookData.title,
          author: bookData.author,
          publisher: bookData.publisher,
          totalStock: bookData.totalStock,
          needsBarcodeSticker: bookData.needsBarcodeSticker,
          bookTags: {
            create: [{ tagId: 1 }, { tagId: 2 }]
          }
        },
        include: {
          bookTags: {
            include: {
              tag: true
            }
          }
        }
      })
      expect(result).toEqual(mockCreatedBook)
    })
  })

  describe('updateStock', () => {
    it('should update book stock', async () => {
      const mockUpdatedBook = {
        isbn: '9780123456789',
        title: 'Test Book',
        totalStock: 15
      }
      mockPrisma.book.update.mockResolvedValue(mockUpdatedBook)

      const result = await booksController.updateStock('9780123456789', 15)

      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { isbn: '9780123456789' },
        data: { totalStock: 15 }
      })
      expect(result).toEqual(mockUpdatedBook)
    })
  })

  describe('incrementStockByOne', () => {
    it('should increment stock by one', async () => {
      const mockUpdatedBook = {
        isbn: '9780123456789',
        title: 'Test Book',
        totalStock: 6
      }
      mockPrisma.book.update.mockResolvedValue(mockUpdatedBook)

      const result = await booksController.incrementStockByOne('9780123456789')

      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { isbn: '9780123456789' },
        data: {
          totalStock: {
            increment: 1
          }
        }
      })
      expect(result).toEqual(mockUpdatedBook)
    })
  })

  describe('decrementStockByOne', () => {
    it('should decrement stock by one', async () => {
      const mockUpdatedBook = {
        isbn: '9780123456789',
        title: 'Test Book',
        totalStock: 4
      }
      mockPrisma.book.update.mockResolvedValue(mockUpdatedBook)

      const result = await booksController.decrementStockByOne('9780123456789')

      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { isbn: '9780123456789' },
        data: {
          totalStock: {
            decrement: 1
          }
        }
      })
      expect(result).toEqual(mockUpdatedBook)
    })
  })

  describe('delete', () => {
    it('should delete a book', async () => {
      const mockDeletedBook = {
        isbn: '9780123456789',
        title: 'Test Book'
      }
      mockPrisma.book.delete.mockResolvedValue(mockDeletedBook)

      const result = await booksController.delete('9780123456789')

      expect(mockPrisma.book.delete).toHaveBeenCalledWith({
        where: { isbn: '9780123456789' }
      })
      expect(result).toEqual(mockDeletedBook)
    })
  })

  describe('bulkDelete', () => {
    it('should delete multiple books', async () => {
      const isbns = ['9780123456789', '9780987654321']
      const mockResult = { count: 2 }
      mockPrisma.book.deleteMany.mockResolvedValue(mockResult)

      const result = await booksController.bulkDelete(isbns)

      expect(mockPrisma.book.deleteMany).toHaveBeenCalledWith({
        where: {
          isbn: {
            in: isbns
          }
        }
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('bulkUpdateTags', () => {
    it('should update tags for multiple books', async () => {
      const isbns = ['9780123456789', '9780987654321']
      const tagIds = [1, 2]
      const mockBooks = [
        { isbn: '9780123456789', title: 'Book 1', bookTags: [] },
        { isbn: '9780987654321', title: 'Book 2', bookTags: [] }
      ]

      mockPrisma.bookTag.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.bookTag.createMany.mockResolvedValue({ count: 4 })
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.bulkUpdateTags(isbns, tagIds)

      expect(mockPrisma.bookTag.deleteMany).toHaveBeenCalledTimes(2)
      expect(mockPrisma.bookTag.createMany).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockBooks)
    })

    it('should handle empty tag array', async () => {
      const isbns = ['9780123456789']
      const tagIds: number[] = []
      const mockBooks = [{ isbn: '9780123456789', title: 'Book 1', bookTags: [] }]

      mockPrisma.bookTag.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.bulkUpdateTags(isbns, tagIds)

      expect(mockPrisma.bookTag.deleteMany).toHaveBeenCalledTimes(1)
      expect(mockPrisma.bookTag.createMany).not.toHaveBeenCalled()
      expect(result).toEqual(mockBooks)
    })
  })

  describe('bulkAddTag', () => {
    it('should add tags to multiple books', async () => {
      const isbns = ['9780123456789', '9780987654321']
      const tagIds = [1, 2]
      const mockBooks = [
        { isbn: '9780123456789', title: 'Book 1', bookTags: [] },
        { isbn: '9780987654321', title: 'Book 2', bookTags: [] }
      ]

      mockPrisma.bookTag.findUnique.mockResolvedValue(null)
      mockPrisma.bookTag.create.mockResolvedValue({ bookIsbn: '9780123456789', tagId: 1 })
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.bulkAddTag(isbns, tagIds)

      expect(mockPrisma.bookTag.findUnique).toHaveBeenCalledTimes(4) // 2 books * 2 tags
      expect(mockPrisma.bookTag.create).toHaveBeenCalledTimes(4)
      expect(result).toEqual(mockBooks)
    })

    it('should skip existing tag assignments', async () => {
      const isbns = ['9780123456789']
      const tagIds = [1]
      const mockBooks = [{ isbn: '9780123456789', title: 'Book 1', bookTags: [] }]

      mockPrisma.bookTag.findUnique.mockResolvedValue({ bookIsbn: '9780123456789', tagId: 1 })
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.bulkAddTag(isbns, tagIds)

      expect(mockPrisma.bookTag.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.bookTag.create).not.toHaveBeenCalled()
      expect(result).toEqual(mockBooks)
    })
  })

  describe('bulkRemoveTag', () => {
    it('should remove tags from multiple books', async () => {
      const isbns = ['9780123456789', '9780987654321']
      const tagIds = [1, 2]
      const mockBooks = [
        { isbn: '9780123456789', title: 'Book 1', bookTags: [] },
        { isbn: '9780987654321', title: 'Book 2', bookTags: [] }
      ]

      mockPrisma.bookTag.deleteMany.mockResolvedValue({ count: 4 })
      mockPrisma.book.findMany.mockResolvedValue(mockBooks)

      const result = await booksController.bulkRemoveTag(isbns, tagIds)

      expect(mockPrisma.bookTag.deleteMany).toHaveBeenCalledWith({
        where: {
          bookIsbn: {
            in: isbns
          },
          tagId: {
            in: tagIds
          }
        }
      })
      expect(result).toEqual(mockBooks)
    })
  })
})
