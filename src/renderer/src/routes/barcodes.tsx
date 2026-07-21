import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import { Download, Filter } from 'lucide-react'
import type { Book, Tag } from '@renderer/types/book'
import { pdf } from '@react-pdf/renderer'
import JsBarcode from 'jsbarcode'
import { BarcodePDF } from '../components/BarcodePDF'
import { DataTable } from '@renderer/components/ui/data-table'
import { getBarcodesColumns } from '@renderer/components/columns/barcodes-columns'
import PageTitle from '@renderer/components/ui/page-title'
import { toast } from 'sonner'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

export const Route = createFileRoute('/barcodes')({
  component: BarcodesPage
})

function BarcodesPage() {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [printCounts, setPrintCounts] = useState<Record<string, number>>({})
  const [bookType, setBookType] = useState<'custom' | 'isbn'>('custom')
  const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([])
  const queryClient = useQueryClient()

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books', 'barcodes', bookType],
    queryFn: async () => {
      if (bookType === 'custom') {
        const result = await window.api.books.getAll(
          1,
          Number.MAX_SAFE_INTEGER,
          'updatedAt',
          'desc',
          'KVB-'
        )
        return result.books
      } else {
        const result = await window.api.books.getAll(
          1,
          Number.MAX_SAFE_INTEGER,
          'updatedAt',
          'desc',
          undefined,
          true
        )
        return result.books.filter((book) => !book.isbn.startsWith('KVB-'))
      }
    }
  })

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  // Filter books by selected tags
  const filteredBooks = useMemo(() => {
    if (selectedTagFilters.length === 0) return books
    return books.filter((book) => {
      if (!book.bookTags || book.bookTags.length === 0) return false
      return selectedTagFilters.some((tagId) => book.bookTags!.some((bt) => bt.tag.id === tagId))
    })
  }, [books, selectedTagFilters])

  // Initialize print counts with actual stock when books change
  useEffect(() => {
    const counts: Record<string, number> = {}
    filteredBooks.forEach((book) => {
      counts[book.isbn] = book.totalStock
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrintCounts(counts)
  }, [filteredBooks])

  // Get selected books from rowSelection
  const selectedBooks = useMemo(
    () => new Set(Object.keys(rowSelection).filter((key) => rowSelection[key])),
    [rowSelection]
  )

  // Mutation for deleting a book
  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'barcodes'] })
    }
  })

  // Handle print count changes (local state only, doesn't update DB)
  const handlePrintCountChange = useCallback((isbn: string, count: number) => {
    setPrintCounts((prev) => ({
      ...prev,
      [isbn]: count
    }))
  }, [])

  const handleDelete = async (isbn: string, title: string): Promise<void> => {
    const confirmed = confirm(
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    try {
      await deleteBookMutation.mutateAsync(isbn)
      // Remove from selection if it was selected
      if (rowSelection[isbn]) {
        const newSelection = { ...rowSelection }
        delete newSelection[isbn]
        setRowSelection(newSelection)
      }
    } catch (error) {
      console.error('Error deleting book:', error)
      toast.error('Failed to delete book. Please try again.')
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

  const handleDownloadPDF = async (booksToPrint: Book[] = []): Promise<void> => {
    if (isGenerating) return

    try {
      setIsGenerating(true)

      if (booksToPrint.length === 0) {
        const selectedISBNs = Object.keys(rowSelection).filter((key) => rowSelection[key])
        booksToPrint = filteredBooks.filter((b) => selectedISBNs.includes(b.isbn))
      }

      if (booksToPrint.length === 0) {
        toast.error('Please select at least one book to generate barcodes.')
        return
      }

      // Repeat books according to their print count
      const booksWithBarcodes = booksToPrint.flatMap((book) => {
        const barcodeDataUrl = generateBarcodeDataUrl(book.isbn)
        if (!barcodeDataUrl) {
          console.warn(`Failed to generate barcode for ${book.isbn}`)
          return []
        }
        const printCount = printCounts[book.isbn] || book.totalStock
        // Create an array with length equal to print count
        return Array.from({ length: printCount }, (_, index) => ({
          isbn: book.isbn,
          title: book.title,
          barcodeDataUrl,
          // Add unique key for each copy
          key: `${book.isbn}-${index}`
        }))
      })

      if (booksWithBarcodes.length === 0) {
        toast.error('Failed to generate any barcodes. Please try again.')
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
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleTagFilter = (tagId: number): void => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const columns = getBarcodesColumns({
    onPrintCountChange: handlePrintCountChange,
    printCounts,
    onDelete: handleDelete,
    isDeleting: deleteBookMutation.isPending
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageTitle title="Print Barcodes" />
      <div className="flex items-center justify-between pb-4 gap-4">
        <ToggleGroup
          type="single"
          value={bookType}
          onValueChange={(value) => value && setBookType(value as 'custom' | 'isbn')}
          variant="outline"
        >
          <ToggleGroupItem value="custom">Custom Books</ToggleGroupItem>
          <ToggleGroupItem value="isbn">ISBN Books</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="size-4 mr-2" />
                  Filter by Tags
                  {selectedTagFilters.length > 0 && ` (${selectedTagFilters.length})`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={selectedTagFilters.includes(tag.id)}
                    onCheckedChange={() => handleToggleTagFilter(tag.id)}
                  >
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTagFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedTagFilters([])}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="secondary"
            onClick={() => handleDownloadPDF(filteredBooks)}
            disabled={filteredBooks.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <Spinner className="size-4 mr-2" />
            ) : (
              <Download className="size-4 mr-2" />
            )}
            Download All PDF ({filteredBooks.length})
          </Button>
          <Button
            onClick={() => handleDownloadPDF()}
            disabled={selectedBooks.size === 0 || isGenerating}
          >
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
      </div>
      <DataTable
        columns={columns}
        data={filteredBooks}
        pageSize={25}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(book) => book.isbn}
      />
      {filteredBooks.length === 0 && books.length > 0 && selectedTagFilters.length > 0 && (
        <div className="text-center text-muted-foreground py-8 text-sm font-light">
          No books found with the selected tag filters.
        </div>
      )}
      {books.length === 0 && (
        <div className="text-center text-muted-foreground py-8 text-sm font-light">
          {bookType === 'custom'
            ? 'No custom books found. Add books manually to see them here.'
            : 'No ISBN books without barcode stickers found. Add books via Manual ISBN mode to see them here.'}
        </div>
      )}
    </div>
  )
}
