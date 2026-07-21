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

  update: async (id: number, data: { name?: string; description?: string; color?: string }) => {
    return await prisma.tag.update({
      where: { id },
      data
    })
  },

  createMany: async (names: string[]) => {
    await prisma.tag.createMany({
      data: names.map((name) => ({ name })),
      skipDuplicates: true
    })

    return await prisma.tag.findMany({
      where: { name: { in: names } }
    })
  },

  delete: async (id: number) => {
    return await prisma.tag.delete({
      where: { id }
    })
  },

  addTagsToBook: async (isbn: string, tagIds: number[]) => {
    await prisma.bookTag.createMany({
      data: tagIds.map((tagId) => ({ bookIsbn: isbn, tagId })),
      skipDuplicates: true
    })

    return await prisma.book.findUnique({
      where: { isbn },
      include: {
        bookTags: { include: { tag: true } }
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
