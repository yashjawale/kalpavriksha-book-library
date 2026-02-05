import { prisma } from '../lib/prisma'

export const tagsController = {
  getAll: async () => {
    return await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    })
  },

  getById: async (id: number) => {
    return await prisma.tag.findUnique({
      where: { id }
    })
  },

  create: async (name: string) => {
    return await prisma.tag.create({
      data: { name }
    })
  },

  createMany: async (names: string[]) => {
    // Create tags one by one, catching duplicate errors
    for (const name of names) {
      try {
        await prisma.tag.create({ data: { name } })
      } catch {
        // Ignore duplicate errors
        console.log(`Tag "${name}" already exists, skipping`)
      }
    }
    // Return all tags with these names
    return await prisma.tag.findMany({
      where: {
        name: {
          in: names
        }
      }
    })
  },

  delete: async (id: number) => {
    return await prisma.tag.delete({
      where: { id }
    })
  },

  addTagsToBook: async (isbn: string, tagIds: number[]) => {
    // Add tags one by one to avoid duplicate errors
    for (const tagId of tagIds) {
      try {
        await prisma.bookTag.create({
          data: {
            bookIsbn: isbn,
            tagId
          }
        })
      } catch {
        // Ignore duplicate errors
        console.log(`Tag ${tagId} already assigned to book ${isbn}, skipping`)
      }
    }
    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  },

  removeTagFromBook: async (isbn: string, tagId: number) => {
    await prisma.bookTag.delete({
      where: {
        bookIsbn_tagId: {
          bookIsbn: isbn,
          tagId
        }
      }
    })
    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: {
          include: {
            tag: true
          }
        }
      }
    })
  }
}

export type TagsController = typeof tagsController
