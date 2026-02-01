import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Spinner } from '@renderer/components/ui/spinner'
import { Input } from '@renderer/components/ui/input'
import { Trash2, Download } from 'lucide-react'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import type { Book, UpdateStockData } from '@renderer/types/book'
import { pdf } from '@react-pdf/renderer'
import JsBarcode from 'jsbarcode'
import { BarcodePDF } from '../components/BarcodePDF'

export const Route = createFileRoute('/barcodes')({
  component: BarcodesPage
})

export default function BarcodesPage() {
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const queryClient = useQueryClient()

  const { data: allBooks = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => await window.api.books.getAll()
  })

  // Filter to only show books with KVB- prefix
  const books = allBooks.filter((book) => book.isbn.startsWith('KVB-'))

  // Mutation for updating stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ isbn, stockCount }: UpdateStockData) => {
      return await window.api.books.updateStock(isbn, stockCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  // Mutation for deleting a book
  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  // Debounced stock update
  const debouncedStockUpdate = useDebouncedCallback((isbn: string, stockCount: number) => {
    updateStockMutation.mutate({ isbn, stockCount })
  }, 500)

  // Stock update handler with optimistic update
  const handleStockChange = useCallback(
    (isbn: string, newStock: number) => {
      // Optimistic update
      queryClient.setQueryData(['books'], (old: Book[] | undefined) => {
        if (!old) return old
        return old.map((book) => (book.isbn === isbn ? { ...book, totalStock: newStock } : book))
      })

      // Debounce the actual API call
      debouncedStockUpdate(isbn, isbn, newStock)
    },
    [queryClient, debouncedStockUpdate]
  )

  const handleDelete = async (isbn: string, title: string): Promise<void> => {
    const confirmed = confirm(
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    try {
      await deleteBookMutation.mutateAsync(isbn)
      // Remove from selected books if it was selected
      if (selectedBooks.has(isbn)) {
        const newSelected = new Set(selectedBooks)
        newSelected.delete(isbn)
        setSelectedBooks(newSelected)
      }
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Failed to delete book. Please try again.')
    }
  }

  const toggleBook = (isbn: string): void => {
    const newSelected = new Set(selectedBooks)
    if (newSelected.has(isbn)) {
      newSelected.delete(isbn)
    } else {
      newSelected.add(isbn)
    }
    setSelectedBooks(newSelected)
  }

  const toggleAll = (): void => {
    if (selectedBooks.size === books.length && books.length > 0) {
      setSelectedBooks(new Set())
    } else {
      setSelectedBooks(new Set(books.map((b) => b.isbn)))
    }
  }

  const generateBarcodeDataUrl = (isbn: string): string => {
    try {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, isbn, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: false
      })
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating barcode:', error)
      return ''
    }
  }

  const handleDownloadPDF = async (): Promise<void> => {
    if (isGenerating) return

    try {
      setIsGenerating(true)
      const booksToPrint = books.filter((b) => selectedBooks.has(b.isbn))

      if (booksToPrint.length === 0) {
        alert('Please select at least one book to generate barcodes.')
        return
      }

      // Repeat books according to their stock count
      const booksWithBarcodes = booksToPrint.flatMap((book) => {
        const barcodeDataUrl = generateBarcodeDataUrl(book.isbn)
        if (!barcodeDataUrl) {
          console.warn(`Failed to generate barcode for ${book.isbn}`)
          return []
        }
        // Create an array with length equal to stock count
        return Array.from({ length: book.totalStock }, (_, index) => ({
          isbn: book.isbn,
          title: book.title,
          barcodeDataUrl,
          // Add unique key for each copy
          key: `${book.isbn}-${index}`
        }))
      })

      if (booksWithBarcodes.length === 0) {
        alert('Failed to generate any barcodes. Please try again.')
        return
      }

      const blob = await pdf(<BarcodePDF books={booksWithBarcodes} />).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `barcodes-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generate & Print Barcodes</CardTitle>
            <Button onClick={handleDownloadPDF} disabled={selectedBooks.size === 0 || isGenerating}>
              {isGenerating ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Download PDF ({selectedBooks.size})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedBooks.size === books.length && books.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-40">ISBN</TableHead>
                <TableHead className="w-22">Stock</TableHead>
                <TableHead className="w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No custom books found. Add books manually to see them here.
                  </TableCell>
                </TableRow>
              ) : (
                books.map((book) => (
                  <TableRow key={book.isbn}>
                    <TableCell>
                      <Checkbox
                        checked={selectedBooks.has(book.isbn)}
                        onCheckedChange={() => toggleBook(book.isbn)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="font-mono text-sm">{book.isbn}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={book.totalStock}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0
                          handleStockChange(book.isbn, Math.max(0, newValue))
                        }}
                        className=""
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(book.isbn, book.title)}
                        className="text-destructive hover:text-destructive"
                        disabled={deleteBookMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
