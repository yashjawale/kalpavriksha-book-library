import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'
import { cn } from '@renderer/lib/utils'
import { useState, useCallback, useReducer } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useBarcodeScanner } from '@renderer/hooks/use-barcode-scanner'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import type { Book, CreateBookData, UpdateStockData } from '@renderer/types/book'
import { TagSelector } from '@renderer/components/TagSelector'
import { SimpleDataTable } from '@renderer/components/ui/simple-data-table'
import { getRecentBooksColumns } from '@renderer/components/columns/recent-books-columns'
import { Zap } from 'lucide-react'

export const Route = createFileRoute('/rapidscan')({
  component: RapidScan
})

type ProcessingState = {
  isProcessing: boolean
  processingText: string
  currentIsbn: string
}

type ProcessingAction =
  | { type: 'START_PROCESSING'; isbn: string; text: string }
  | { type: 'UPDATE_TEXT'; text: string }
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
    case 'RESET':
      return {
        isProcessing: false,
        processingText: 'Ready...',
        currentIsbn: ''
      }
    default:
      return state
  }
}

const beep = (type: 'success' | 'error') => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

    if (type === 'success') {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1)
      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.1)
    } else {
      for (let i = 0; i < 2; i++) {
        const oscillator = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        oscillator.type = 'square'
        oscillator.frequency.value = 400
        const startTime = audioCtx.currentTime + i * 0.2
        gainNode.gain.setValueAtTime(1.0, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.1)
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.1)
      }
    }
  } catch (e) {
    console.error('Audio playback failed', e)
  }
}

function RapidScan() {
  const [processingState, dispatchProcessing] = useReducer(processingReducer, {
    isProcessing: false,
    processingText: 'Ready...',
    currentIsbn: ''
  })
  const [preselectedTagIds, setPreselectedTagIds] = useState<number[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [pulsingIsbn, setPulsingIsbn] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: recentBooks = [] } = useQuery<Book[]>({
    queryKey: ['books', 'recent'],
    queryFn: async () => await window.api.books.getAll(1, 25, 'updatedAt', 'desc')
  })

  const createBookMutation = useMutation({
    mutationFn: async (data: CreateBookData) => {
      return await window.api.books.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  const updateStockMutation = useMutation({
    mutationFn: async ({ isbn, stockCount }: UpdateStockData) => {
      return await window.api.books.updateStock(isbn, stockCount)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  })

  const handleBarcodeScanned = useCallback(
    async (isbn: string) => {
      if (processingState.isProcessing) return

      dispatchProcessing({
        type: 'START_PROCESSING',
        isbn,
        text: `Searching: ${isbn}...`
      })

      try {
        const existingBook = await window.api.books.getById(isbn)

        if (existingBook) {
          const newCount = existingBook.totalStock + 1
          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Updating count for "${existingBook.title}"...`
          })
          await updateStockMutation.mutateAsync({ isbn, stockCount: newCount })

          setPulsingIsbn(isbn)
          setTimeout(() => setPulsingIsbn(null), 1000)

          beep('success')
          dispatchProcessing({ type: 'RESET' })
          return
        }

        dispatchProcessing({ type: 'UPDATE_TEXT', text: 'Searching online...' })
        let bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getGoogleBooksInfo', isbn)

        if (!bookInfo) {
          bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getOpenLibraryInfo', isbn)
        }

        if (!bookInfo) {
          bookInfo = await window.electron.ipcRenderer.invoke('bookApi:getIndianBooksInfo', isbn)
        }

        if (bookInfo && bookInfo.title) {
          dispatchProcessing({
            type: 'UPDATE_TEXT',
            text: `Adding "${bookInfo.title}"...`
          })
          await createBookMutation.mutateAsync({
            isbn,
            title: bookInfo.title,
            author: bookInfo.author,
            publisher: bookInfo.publisher,
            tagIds: preselectedTagIds,
            needsBarcodeSticker: false,
            totalStock: 1
          })

          beep('success')
          dispatchProcessing({ type: 'RESET' })
        } else {
          beep('error')
          dispatchProcessing({ type: 'RESET' })
        }
      } catch (error) {
        console.error('Error processing barcode:', error)
        beep('error')
        dispatchProcessing({ type: 'RESET' })
      }
    },
    [createBookMutation, updateStockMutation, preselectedTagIds, processingState.isProcessing]
  )

  useBarcodeScanner({
    onScan: handleBarcodeScanned,
    enabled: !processingState.isProcessing && !isTagDialogOpen
  })

  const debouncedStockUpdate = useDebouncedCallback(async (isbn: string, stockCount: number) => {
    try {
      await updateStockMutation.mutateAsync({ isbn, stockCount })
    } catch (error) {
      console.error('Error updating stock:', error)
      queryClient.invalidateQueries({ queryKey: ['books', 'recent'] })
    }
  }, 500)

  const handleStockChange = useCallback(
    (isbn: string, newStock: number) => {
      setPulsingIsbn(isbn)
      setTimeout(() => setPulsingIsbn(null), 1000)

      queryClient.setQueryData(['books', 'recent'], (old: Book[] | undefined) => {
        if (!old) return old
        return old.map((book) => (book.isbn === isbn ? { ...book, totalStock: newStock } : book))
      })

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

  const recentBooksColumns = getRecentBooksColumns({
    onStockChange: handleStockChange,
    onDelete: handleDelete
  })

  return (
    <>
      <Card className="bg-primary/5">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {processingState.isProcessing ? (
                <Spinner className="size-16 text-primary" />
              ) : (
                <Zap className="size-16 text-primary p-2 bg-primary/10 rounded-full mt-4" />
              )}
              <h1 className="text-lg font-medium max-w-md mt-4">
                {processingState.isProcessing
                  ? processingState.processingText
                  : 'Scan a barcode to rapidly add books'}
              </h1>
            </div>
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
              onDialogOpenChange={setIsTagDialogOpen}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recently Scanned</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBooks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No books scanned yet. Start scanning to add books.
            </p>
          ) : (
            <SimpleDataTable
              columns={recentBooksColumns}
              data={recentBooks}
              getRowClassName={(book: Book) =>
                cn(pulsingIsbn === book.isbn && 'animate-pulse-primary')
              }
              emptyMessage="No books scanned yet. Start scanning to add books."
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
