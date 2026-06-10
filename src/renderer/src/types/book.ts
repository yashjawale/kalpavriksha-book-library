export interface Tag {
  id: number
  name: string
  description?: string | null
  color?: string | null
  createdAt: Date
}

export interface Book {
  isbn: string
  title: string
  author?: string | null
  publisher?: string | null
  totalStock: number
  needsBarcodeSticker: boolean
  createdAt: Date
  updatedAt: Date
  bookTags?: { tag: Tag }[]
}

export interface CreateBookData {
  isbn: string
  title: string
  author?: string
  publisher?: string
  totalStock: number
  needsBarcodeSticker?: boolean
  tagIds?: number[]
}

export interface UpdateStockData {
  isbn: string
  stockCount: number
}
