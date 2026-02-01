import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import Bulk from '../assets/images/bulk.svg'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Field, FieldGroup } from '@renderer/components/ui/field'
import { useState, useCallback } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { ButtonGroup } from '@renderer/components/ui/button-group'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBarcodeScanner } from '@renderer/hooks/use-barcode-scanner'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import type { Book, CreateBookData, UpdateStockData } from '@renderer/types/book'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

function BulkAdd() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingText, setProcessingText] = useState('Processing...')
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [currentIsbn, setCurrentIsbn] = useState('')
  const queryClient = useQueryClient()

  // Fetch recent books using React Query
  const { data: recentBooks = [] } = useQuery({
    queryKey: ['books', 'recent'],
    queryFn: async () => {
      const books = await window.electron.ipcRenderer.invoke(
        'books:getAll',
        1,
        25,
        'createdAt',
        'desc'
      )
      return books as Book[]
    }
  })

  // Mutation for creating a book
  const createBookMutation = useMutation({
    mutationFn: async (data: CreateBookData) => {
      return await window.electron.ipcRenderer.invoke('books:create', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  // Mutation for updating stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ isbn, stockCount }: UpdateStockData) => {
      return await window.electron.ipcRenderer.invoke('books:updateStock', isbn, stockCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  // Mutation for deleting a book
  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.electron.ipcRenderer.invoke('books:delete', isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  const handleBarcodeScanned = useCallback(
    async (isbn: string) => {
      setIsProcessing(true)
      setProcessingText(`Searching for book with ISBN: ${isbn}...`)
      setCurrentIsbn(isbn)

      try {
        // Try Google Books first
        setProcessingText('Searching Google Books...')
        let bookTitle = await window.electron.ipcRenderer.invoke('bookApi:getGoogleBooks', isbn)

        // If not found, try OpenLibrary
        if (!bookTitle) {
          setProcessingText('Searching OpenLibrary...')
          bookTitle = await window.electron.ipcRenderer.invoke('bookApi:getOpenLibrary', isbn)
        }

        if (bookTitle) {
          // Book found, add it to database
          setProcessingText(`Adding "${bookTitle}" to library...`)
          await createBookMutation.mutateAsync({
            isbn,
            title: bookTitle,
            totalStock: 1
          })
          setProcessingText(`Successfully added "${bookTitle}"`)
          // Reset after short delay
          setTimeout(() => {
            setIsProcessing(false)
            setProcessingText('Processing...')
          }, 2000)
        } else {
          // Book not found, show manual entry dialog
          setIsProcessing(false)
          setShowManualDialog(true)
        }
      } catch (error) {
        console.error('Error processing barcode:', error)
        setProcessingText('Error processing barcode. Please try again.')
        setIsProcessing(false)
        setTimeout(() => {
          setProcessingText('Processing...')
        }, 2000)
      }
    },
    [createBookMutation]
  )

  // Barcode scanner hook
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: !isProcessing && !showManualDialog
  })

  const handleManualEntry = async (title: string, count: number) => {
    setShowManualDialog(false)
    setIsProcessing(true)
    setProcessingText(`Adding "${title}" to library...`)

    try {
      await createBookMutation.mutateAsync({
        isbn: currentIsbn,
        title,
        totalStock: count
      })
      setProcessingText(`Successfully added "${title}"`)
      // Reset after short delay
      setTimeout(() => {
        setIsProcessing(false)
        setProcessingText('Processing...')
        setCurrentIsbn('')
      }, 2000)
    } catch (error) {
      console.error('Error adding book manually:', error)
      setProcessingText('Error adding book. Please try again.')
      setIsProcessing(false)
      setTimeout(() => {
        setProcessingText('Processing...')
      }, 2000)
    }
  }

  // Debounced callback for stock updates
  const debouncedStockUpdate = useDebouncedCallback(async (isbn: string, stockCount: number) => {
    try {
      await updateStockMutation.mutateAsync({ isbn, stockCount })
    } catch (error) {
      console.error('Error updating stock:', error)
      // React Query will automatically revert on error
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  }, 500)

  const handleStockChange = useCallback(
    (isbn: string, newStock: number) => {
      // Optimistic update
      queryClient.setQueryData(['books', 'recent'], (old: Book[] | undefined) => {
        if (!old) return old
        return old.map((book) => (book.isbn === isbn ? { ...book, totalStock: newStock } : book))
      })

      // Debounce the actual API call
      debouncedStockUpdate(isbn, isbn, newStock)
    },
    [queryClient, debouncedStockUpdate]
  )

  const handleDelete = useCallback(
    async (isbn: string) => {
      try {
        await deleteBookMutation.mutateAsync(isbn)
      } catch (error) {
        console.error('Error deleting book:', error)
      }
    },
    [deleteBookMutation]
  )

  return (
    <>
      {/* Dialog for entering name manually */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const title = formData.get('title') as string
              const count = parseInt(formData.get('count') as string) || 1
              handleManualEntry(title, count)
              e.currentTarget.reset()
            }}
          >
            <DialogHeader>
              <DialogTitle>Enter Book Title</DialogTitle>
              <DialogDescription>
                <p>
                  The book&apos;s title wasn&apos;t found through online sources. Please enter it
                  manually.
                </p>
                <p className="font-mono opacity-75 mt-2">{currentIsbn}</p>
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </Field>
              <Field>
                <Label htmlFor="count">Count</Label>
                <Input id="count" name="count" type="number" defaultValue={1} min={1} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Add book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="bg-primary/8">
        <CardContent>
          <div className="flex items-center gap-4">
            {isProcessing ? (
              <Spinner className="size-16 text-primary" />
            ) : (
              <img src={Bulk} alt="Bulk Add Books" width={80} />
            )}
            <h1 className="text-lg font-medium max-w-md">
              {isProcessing ? processingText : 'Scan a barcode to begin adding books'}
            </h1>
          </div>
        </CardContent>
        <hr />
        {/* Ignore labels functionality for now */}
        {/* <CardFooter className="flex flex-col items-start gap-3">
          <h3 className="font-medium">Auto Labels</h3>
          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
          </div>
        </CardFooter> */}
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recently Added</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBooks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No books added yet. Start scanning to add books.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">ISBN</TableHead>
                  <TableHead className="w-40">Date Added</TableHead>
                  <TableHead className="w-50">Count</TableHead>
                  <TableHead className="w-25">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBooks.map((book) => (
                  <TableRow key={book.isbn}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono opacity-90">
                      {book.isbn}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(book.createdAt).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <ButtonGroup>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleStockChange(book.isbn, Math.max(0, book.totalStock - 1))
                          }
                          disabled={book.totalStock <= 0}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <div className="bg-muted flex items-center justify-center px-4 text-sm font-medium min-w-15 border-y">
                          {book.totalStock}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockChange(book.isbn, book.totalStock + 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </ButtonGroup>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(book.isbn)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
