export interface Book {
  isbn: string
  title: string
  totalStock: number
  createdAt: string
  updatedAt: string
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
