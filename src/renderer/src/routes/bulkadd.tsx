import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import Bulk from '../assets/images/bulk.svg'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'
import { cn, generateKVBId } from '@renderer/lib/utils'
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
import { useState, useCallback, useReducer } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBarcodeScanner } from '@renderer/hooks/use-barcode-scanner'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import type { Book, CreateBookData, UpdateStockData } from '@renderer/types/book'
import { useForm } from 'react-hook-form'
import { TagSelector } from '@renderer/components/TagSelector'
import { SimpleDataTable } from '@renderer/components/ui/simple-data-table'
import { getRecentBooksColumns } from '@renderer/components/columns/recent-books-columns'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { EditBookDialog } from '@renderer/components/EditBookDialog'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

const ANIMATION_DELAY = 1000

type BulkAddMode = 'scan' | 'manual-isbn' | 'manual'

type BookFormData = {
  title: string
  author: string
  publisher: string
  count: number
}

type ProcessingState = {
  isProcessing: boolean
  processingText: string
  showManualDialog: boolean
  currentIsbn: string
}

type ProcessingAction =
  | { type: 'START_PROCESSING'; isbn: string; text: string }
  | { type: 'UPDATE_TEXT'; text: string }
  | { type: 'SHOW_MANUAL_DIALOG' }
  | { type: 'HIDE_MANUAL_DIALOG' }
  | { type: 'RESET' }

const processingReducer = (state: ProcessingState, action: ProcessingAction): ProcessingState => {
  switch (action.type) {
    case 'START_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        processingText: action.text,
        currentIsbn: action.isbn
      }
    case 'UPDATE_TEXT':
      return { ...state, processingText: action.text }
    case 'SHOW_MANUAL_DIALOG':
      return { ...state, isProcessing: false, showManualDialog: true }
    case 'HIDE_MANUAL_DIALOG':
      return { ...state, showManualDialog: false }
    case 'RESET':
      return {
        isProcessing: false,
        processingText: 'Processing...',
        showManualDialog: false,
        currentIsbn: ''
      }
    default:
      return state
  }
}

function BulkAdd() {
  const [processingState, dispatchProcessing] = useReducer(processingReducer, {
    isProcessing: false,
    processingText: 'Processing...',
    showManualDialog: false,
    currentIsbn: ''
  })
  const [mode, setMode] = useState<BulkAddMode>('scan')
  const [preselectedTagIds, setPreselectedTagIds] = useState<number[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [pulsingIsbn, setPulsingIsbn] = useState<string | null>(null)
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false)
  const [editDetailsBook, setEditDetailsBook] = useState<Book | null>(null)
  const queryClient = useQueryClient()

  // React Hook Form for manual entry dialog
  const dialogForm = useForm<BookFormData>({
    defaultValues: {
      title: '',
      author: '',
      publisher: '',
      count: 1
    }
  })

  // React Hook Form for manual mode inline form
  const manualModeForm = useForm<BookFormData>({
    defaultValues: {
      title: '',
      author: '',
      publisher: '',
      count: 1
    }
  })

  // React Hook Form for manual ISBN mode
  const manualIsbnForm = useForm<{ isbn: string }>({
    defaultValues: {
      isbn: ''
    }
  })

  // Fetch recent books using React Query
  const { data: recentBooks = [] } = useQuery<Book[]>({
    queryKey: ['books', 'recent'],
    queryFn: async () => await window.api.books.getAll(1, 25, 'updatedAt', 'desc')
  })

  // Mutation for creating a book
  const createBookMutation = useMutation({
    mutationFn: async (data: CreateBookData) => {
      return await window.api.books.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  // Mutation for updating stock
  const updateStockMutation = useMutation({
    mutationFn: async ({ isbn, stockCount }: UpdateStockData) => {
      return await window.api.books.updateStock(isbn, stockCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  // Removed updateDetailsMutation as it is now handled by EditBookDialog

  // Mutation for deleting a book
  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  const handleBarcodeScanned = useCallback(
    async (isbn: string, needsBarcodeSticker: boolean = false) => {
      dispatchProcessing({
        type: 'START_PROCESSING',
        isbn,
        text: `Searching for book with ISBN: ${isbn}...`
      })

      try {
        // Check if book already exists in the database (actual DB call)
        const existingBook = await window.api.books.getById(isbn)

        if (existingBook) {
          // Book exists, increment its count
          const newCount = existingBook.totalStock + 1
          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Book "${existingBook.title}" already exists, increasing count to ${newCount}...`
          })
          await updateStockMutation.mutateAsync({ isbn, stockCount: newCount })

          // Trigger pulse animation
          setPulsingIsbn(isbn)
          setTimeout(() => setPulsingIsbn(null), 1000)

          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Successfully updated count for "${existingBook.title}" to ${newCount}`
          })
          // Reset after short delay
          setTimeout(() => {
            dispatchProcessing({ type: 'RESET' })
          }, ANIMATION_DELAY)
          return
        }

        // Try Google Books first
        dispatchProcessing({ type: 'UPDATE_TEXT', text: 'Searching Google Books...' })
        let bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getGoogleBooksInfo', isbn)

        // If not found, try OpenLibrary
        if (!bookInfo) {
          dispatchProcessing({ type: 'UPDATE_TEXT', text: 'Searching OpenLibrary...' })
          bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getOpenLibraryInfo', isbn)
        }

        // If not found, try IndianBooks
        if (!bookInfo) {
          dispatchProcessing({ type: 'UPDATE_TEXT', text: 'Searching Indian Registry...' })
          bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getIndianBooksInfo', isbn)
        }

        if (bookInfo && bookInfo.title) {
          // Book found, add it to database
          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Adding "${bookInfo.title}" to library...`
          })
          await createBookMutation.mutateAsync({
            isbn,
            title: bookInfo.title,
            author: bookInfo.author,
            publisher: bookInfo.publisher,
            tagIds: preselectedTagIds,
            needsBarcodeSticker,
            totalStock: 1
          })
          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Successfully added "${bookInfo.title}"`
          })
          // Reset after short delay
          setTimeout(() => {
            dispatchProcessing({ type: 'RESET' })
          }, ANIMATION_DELAY)
        } else {
          // Book not found, show manual entry dialog
          dispatchProcessing({ type: 'SHOW_MANUAL_DIALOG' })
        }
      } catch (error) {
        console.error('Error processing barcode:', error)
        dispatchProcessing({
          type: 'UPDATE_TEXT',
          text: 'Error processing barcode. Please try again.'
        })
        setTimeout(() => {
          dispatchProcessing({ type: 'RESET' })
        }, ANIMATION_DELAY)
      }
    },
    [createBookMutation, updateStockMutation, preselectedTagIds]
  )

  // Barcode scanner hook
  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled:
      !processingState.isProcessing &&
      !processingState.showManualDialog &&
      mode === 'scan' &&
      !isTagDialogOpen
  })

  const handleManualAdd = manualModeForm.handleSubmit(async (data) => {
    dispatchProcessing({
      type: 'START_PROCESSING',
      isbn: '',
      text: `Adding "${data.title}" to library...`
    })

    try {
      const localIsbn = generateKVBId()
      await createBookMutation.mutateAsync({
        isbn: localIsbn,
        title: data.title,
        author: data.author || undefined,
        publisher: data.publisher || undefined,
        tagIds: preselectedTagIds,
        needsBarcodeSticker: false, // Custom books always need barcodes but we handle them differently
        totalStock: data.count
      })
      dispatchProcessing({
        type: 'UPDATE_TEXT',
        text: `Successfully added "${data.title}"`
      })
      manualModeForm.reset()
      // Reset after short delay
      setTimeout(() => {
        dispatchProcessing({ type: 'RESET' })
      }, ANIMATION_DELAY)
    } catch (error) {
      console.error('Error adding book manually:', error)
      dispatchProcessing({
        type: 'UPDATE_TEXT',
        text: 'Error adding book. Please try again.'
      })
      setTimeout(() => {
        dispatchProcessing({ type: 'RESET' })
      }, ANIMATION_DELAY)
    }
  })

  const handleManualIsbnSubmit = manualIsbnForm.handleSubmit(async (data) => {
    if (!data.isbn.trim()) return
    await handleBarcodeScanned(data.isbn.trim(), true) // needsBarcodeSticker = true
    manualIsbnForm.reset()
  })

  const handleManualEntry = dialogForm.handleSubmit(async (data) => {
    dispatchProcessing({ type: 'HIDE_MANUAL_DIALOG' })
    dispatchProcessing({
      type: 'START_PROCESSING',
      isbn: processingState.currentIsbn,
      text: `Adding "${data.title}" to library...`
    })

    try {
      await createBookMutation.mutateAsync({
        isbn: processingState.currentIsbn,
        title: data.title,
        author: data.author || undefined,
        publisher: data.publisher || undefined,
        tagIds: preselectedTagIds,
        needsBarcodeSticker: mode === 'manual-isbn', // Only mark as needing barcode sticker if in manual ISBN mode
        totalStock: data.count
      })
      dispatchProcessing({ type: 'UPDATE_TEXT', text: `Successfully added "${data.title}"` })
      dialogForm.reset()
      // Reset after short delay
      setTimeout(() => {
        dispatchProcessing({ type: 'RESET' })
      }, ANIMATION_DELAY)
    } catch (error) {
      console.error('Error adding book manually:', error)
      dispatchProcessing({
        type: 'UPDATE_TEXT',
        text: 'Error adding book. Please try again.'
      })
      setTimeout(() => {
        dispatchProcessing({ type: 'RESET' })
      }, ANIMATION_DELAY)
    }
  })

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
      // Trigger pulse animation
      setPulsingIsbn(isbn)
      setTimeout(() => setPulsingIsbn(null), 1000)

      // Optimistic update
      queryClient.setQueryData(['books', 'recent'], (old: Book[] | undefined) => {
        if (!old) return old
        return old.map((book) => (book.isbn === isbn ? { ...book, totalStock: newStock } : book))
      })

      // Debounce the actual API call - key is isbn, then the actual params
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

  const handleEditDetails = useCallback((book: Book): void => {
    setEditDetailsBook(book)
    setEditDetailsDialogOpen(true)
  }, [])

  const handleTagDialogOpenChange = useCallback((open: boolean) => {
    setIsTagDialogOpen(open)
    if (!open) {
      requestAnimationFrame(() => {
        const activeElement = document.activeElement
        if (activeElement instanceof HTMLElement) {
          activeElement.blur()
        }
      })
    }
  }, [])

  const recentBooksColumns = getRecentBooksColumns({
    onStockChange: handleStockChange,
    onDelete: handleDelete,
    onEditDetails: handleEditDetails
  })

  return (
    <>
      {/* Dialog for entering name manually */}
      <Dialog
        open={processingState.showManualDialog}
        onOpenChange={(open) => {
          dispatchProcessing({ type: open ? 'SHOW_MANUAL_DIALOG' : 'HIDE_MANUAL_DIALOG' })
          if (!open) dialogForm.reset()
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleManualEntry}>
            <DialogHeader>
              <DialogTitle>Enter Book Details</DialogTitle>
              <DialogDescription>
                <p>
                  The book&apos;s information wasn&apos;t found through online sources. Please enter
                  it manually.
                </p>
                <p className="font-mono opacity-75 mt-2">{processingState.currentIsbn}</p>
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <Label htmlFor="dialog-title">Title</Label>
                <Input id="dialog-title" {...dialogForm.register('title', { required: true })} />
                {dialogForm.formState.errors.title && (
                  <p className="text-sm text-destructive">Title is required</p>
                )}
              </Field>
              <Field>
                <Label htmlFor="dialog-author">Author</Label>
                <Input id="dialog-author" {...dialogForm.register('author')} />
              </Field>
              <Field>
                <Label htmlFor="dialog-publisher">Publisher</Label>
                <Input id="dialog-publisher" {...dialogForm.register('publisher')} />
              </Field>
              <Field>
                <Label htmlFor="dialog-count">Count</Label>
                <Input
                  id="dialog-count"
                  type="number"
                  {...dialogForm.register('count', {
                    valueAsNumber: true,
                    min: 1
                  })}
                />
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

      <Card className="bg-primary/5">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {processingState.isProcessing ? (
                <Spinner className="size-16 text-primary" />
              ) : (
                <img src={Bulk} alt="Bulk Add Books" width={80} />
              )}
              <h1 className="text-lg font-medium max-w-md">
                {processingState.isProcessing
                  ? processingState.processingText
                  : mode === 'scan'
                    ? 'Scan a barcode to begin adding books'
                    : mode === 'manual-isbn'
                      ? 'Enter ISBN manually (for books without barcode stickers)'
                      : 'Enter book details manually (for books without ISBN)'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => value && setMode(value as BulkAddMode)}
                disabled={processingState.isProcessing}
                variant="outline"
              >
                <ToggleGroupItem value="scan">Scan</ToggleGroupItem>
                <ToggleGroupItem value="manual-isbn">Manual ISBN</ToggleGroupItem>
                <ToggleGroupItem value="manual">Manual</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {/* Tag preselection - always visible */}
          </div>
          <div>
            <Label className="text-sm font-medium my-2 pt-3 block border-b pb-2">
              Preselect Tags
            </Label>
            <TagSelector
              selectedTagIds={preselectedTagIds}
              onTagsChange={setPreselectedTagIds}
              showAsPreselection={true}
              dialogOpen={isTagDialogOpen}
              onDialogOpenChange={handleTagDialogOpenChange}
            />
          </div>

          {mode === 'manual-isbn' && !processingState.isProcessing && (
            <form onSubmit={handleManualIsbnSubmit} className="flex gap-2 pt-2">
              <Input
                placeholder="Enter ISBN Code"
                className="bg-background flex-1"
                {...manualIsbnForm.register('isbn', { required: true })}
                autoFocus
              />
              <Button type="submit">Lookup ISBN</Button>
            </form>
          )}

          {mode === 'manual' && !processingState.isProcessing && (
            <form onSubmit={handleManualAdd} className="flex gap-2 pt-2">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Book Title *"
                  className="bg-background"
                  {...manualModeForm.register('title', { required: true })}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Author"
                    className="bg-background flex-1"
                    {...manualModeForm.register('author')}
                  />
                  <Input
                    placeholder="Publisher"
                    className="bg-background flex-1"
                    {...manualModeForm.register('publisher')}
                  />
                </div>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Count"
                  className="bg-background"
                  min={1}
                  {...manualModeForm.register('count', {
                    valueAsNumber: true,
                    min: 1
                  })}
                />
              </div>
              <Button type="submit">Add Book</Button>
            </form>
          )}
        </CardContent>
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
            <SimpleDataTable
              columns={recentBooksColumns}
              data={recentBooks}
              getRowClassName={(book: Book) =>
                cn(pulsingIsbn === book.isbn && 'animate-pulse-primary')
              }
              emptyMessage="No books added yet. Start scanning to add books."
            />
          )}
        </CardContent>
      </Card>

      <EditBookDialog
        book={editDetailsBook}
        open={editDetailsDialogOpen}
        onOpenChange={setEditDetailsDialogOpen}
      />
    </>
  )
}
