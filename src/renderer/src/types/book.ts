export interface Book {
  isbn: string
  title: string
  totalStock: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateBookData {
  isbn: string
  title: string
  totalStock: number
}

export interface UpdateStockData {
  isbn: string
  stockCount: number
}
