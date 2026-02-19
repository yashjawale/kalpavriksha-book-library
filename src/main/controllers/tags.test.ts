import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tagsController } from './tags'

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    book: {
      findUnique: vi.fn()
    },
    bookTag: {
      create: vi.fn(),
      delete: vi.fn()
    }
  }
}))

// Get the mocked prisma
const { prisma: mockPrisma } = await import('../lib/prisma')

// Mock console.log to test error handling
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

describe('tagsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch all tags sorted by name', async () => {
      const mockTags = [
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Non-Fiction' },
        { id: 3, name: 'Science' }
      ]
      mockPrisma.tag.findMany.mockResolvedValue(mockTags)

      const result = await tagsController.getAll()

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' }
      })
      expect(result).toEqual(mockTags)
    })

    it('should return empty array when no tags exist', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([])

      const result = await tagsController.getAll()

      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('should fetch a tag by ID', async () => {
      const mockTag = { id: 1, name: 'Fiction' }
      mockPrisma.tag.findUnique.mockResolvedValue(mockTag)

      const result = await tagsController.getById(1)

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
      expect(result).toEqual(mockTag)
    })

    it('should return null for non-existent tag', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null)

      const result = await tagsController.getById(999)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new tag', async () => {
      const mockTag = { id: 1, name: 'New Tag' }
      mockPrisma.tag.create.mockResolvedValue(mockTag)

      const result = await tagsController.create('New Tag')

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: { name: 'New Tag' }
      })
      expect(result).toEqual(mockTag)
    })

    it('should handle empty string tag name', async () => {
      const mockTag = { id: 1, name: '' }
      mockPrisma.tag.create.mockResolvedValue(mockTag)

      const result = await tagsController.create('')

      expect(mockPrisma.tag.create).toHaveBeenCalledWith({
        data: { name: '' }
      })
      expect(result).toEqual(mockTag)
    })
  })

  describe('createMany', () => {
    it('should create multiple tags', async () => {
      const names = ['Tag1', 'Tag2', 'Tag3']
      const mockCreatedTags = [
        { id: 1, name: 'Tag1' },
        { id: 2, name: 'Tag2' },
        { id: 3, name: 'Tag3' }
      ]

      mockPrisma.tag.create.mockResolvedValue(mockCreatedTags[0])
      mockPrisma.tag.findMany.mockResolvedValue(mockCreatedTags)

      const result = await tagsController.createMany(names)

      expect(mockPrisma.tag.create).toHaveBeenCalledTimes(3)
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            in: names
          }
        }
      })
      expect(result).toEqual(mockCreatedTags)
    })

    it('should handle duplicate tags gracefully', async () => {
      const names = ['Tag1', 'Tag2']
      const mockCreatedTags = [
        { id: 1, name: 'Tag1' },
        { id: 2, name: 'Tag2' }
      ]

      mockPrisma.tag.create
        .mockResolvedValueOnce(mockCreatedTags[0])
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      mockPrisma.tag.findMany.mockResolvedValue(mockCreatedTags)

      const result = await tagsController.createMany(names)

      expect(mockPrisma.tag.create).toHaveBeenCalledTimes(2)
      expect(mockConsoleLog).toHaveBeenCalledWith('Tag "Tag2" already exists, skipping')
      expect(result).toEqual(mockCreatedTags)
    })

    it('should handle empty array', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([])

      const result = await tagsController.createMany([])

      expect(mockPrisma.tag.create).not.toHaveBeenCalled()
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            in: []
          }
        }
      })
      expect(result).toEqual([])
    })
  })

  describe('delete', () => {
    it('should delete a tag', async () => {
      const mockDeletedTag = { id: 1, name: 'Fiction' }
      mockPrisma.tag.delete.mockResolvedValue(mockDeletedTag)

      const result = await tagsController.delete(1)

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      })
      expect(result).toEqual(mockDeletedTag)
    })
  })

  describe('addTagsToBook', () => {
    it('should add tags to a book', async () => {
      const isbn = '9780123456789'
      const tagIds = [1, 2]
      const mockBook = {
        isbn,
        title: 'Test Book',
        bookTags: [
          { tagId: 1, tag: { id: 1, name: 'Fiction' } },
          { tagId: 2, tag: { id: 2, name: 'Science' } }
        ]
      }

      mockPrisma.bookTag.create.mockResolvedValue({ bookIsbn: isbn, tagId: 1 })
      mockPrisma.book.findUnique.mockResolvedValue(mockBook)

      const result = await tagsController.addTagsToBook(isbn, tagIds)

      expect(mockPrisma.bookTag.create).toHaveBeenCalledTimes(2)
      expect(mockPrisma.bookTag.create).toHaveBeenCalledWith({
        data: { bookIsbn: isbn, tagId: 1 }
      })
      expect(mockPrisma.bookTag.create).toHaveBeenCalledWith({
        data: { bookIsbn: isbn, tagId: 2 }
      })
      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { isbn },
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

    it('should handle duplicate tag assignments gracefully', async () => {
      const isbn = '9780123456789'
      const tagIds = [1, 2]
      const mockBook = {
        isbn,
        title: 'Test Book',
        bookTags: [{ tagId: 1, tag: { id: 1, name: 'Fiction' } }]
      }

      mockPrisma.bookTag.create
        .mockResolvedValueOnce({ bookIsbn: isbn, tagId: 1 })
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      mockPrisma.book.findUnique.mockResolvedValue(mockBook)

      const result = await tagsController.addTagsToBook(isbn, tagIds)

      expect(mockPrisma.bookTag.create).toHaveBeenCalledTimes(2)
      expect(mockConsoleLog).toHaveBeenCalledWith(
        `Tag 2 already assigned to book ${isbn}, skipping`
      )
      expect(result).toEqual(mockBook)
    })

    it('should handle empty tag array', async () => {
      const isbn = '9780123456789'
      const tagIds: number[] = []
      const mockBook = {
        isbn,
        title: 'Test Book',
        bookTags: []
      }

      mockPrisma.book.findUnique.mockResolvedValue(mockBook)

      const result = await tagsController.addTagsToBook(isbn, tagIds)

      expect(mockPrisma.bookTag.create).not.toHaveBeenCalled()
      expect(result).toEqual(mockBook)
    })
  })

  describe('removeTagFromBook', () => {
    it('should remove a tag from a book', async () => {
      const isbn = '9780123456789'
      const tagId = 1
      const mockBook = {
        isbn,
        title: 'Test Book',
        bookTags: []
      }

      mockPrisma.bookTag.delete.mockResolvedValue({ bookIsbn: isbn, tagId })
      mockPrisma.book.findUnique.mockResolvedValue(mockBook)

      const result = await tagsController.removeTagFromBook(isbn, tagId)

      expect(mockPrisma.bookTag.delete).toHaveBeenCalledWith({
        where: {
          bookIsbn_tagId: {
            bookIsbn: isbn,
            tagId
          }
        }
      })
      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { isbn },
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
  })
})
