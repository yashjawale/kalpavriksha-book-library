export interface Book {
  isbn: string
  title: string
  author?: string | null
  publisher?: string | null
  totalStock: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateBookData {
  isbn: string
  title: string
  author?: string
  publisher?: string
  totalStock: number
}

export interface UpdateStockData {
  isbn: string
  stockCount: number
}
