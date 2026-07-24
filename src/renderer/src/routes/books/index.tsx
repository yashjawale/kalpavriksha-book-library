import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@renderer/components/ui/spinner'
import type { Book, Tag } from '@renderer/types/book'
import { DataTable } from '@renderer/components/ui/data-table'
import { getBooksColumns } from '@renderer/components/columns/books-columns'
import PageTitle from '@renderer/components/ui/page-title'
import { useState, useMemo, useCallback } from 'react'
import { useSimpleDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { Button } from '@renderer/components/ui/button'
import { Trash2, Tag as TagIcon, Plus, Minus, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { TagSelector } from '@renderer/components/TagSelector'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Filter } from 'lucide-react'
import { EditBookDialog } from '@renderer/components/EditBookDialog'
import { toast } from 'sonner'

export const Route = createFileRoute('/books/')({
  component: ManageBooks
})

function ManageBooks() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [discardBooksDialogOpen, setDiscardBooksDialogOpen] = useState(false)
  const [changeTagsDialogOpen, setChangeTagsDialogOpen] = useState(false)
  const [bulkChangeTagsDialogOpen, setBulkChangeTagsDialogOpen] = useState(false)
  const [bulkAddTagDialogOpen, setBulkAddTagDialogOpen] = useState(false)
  const [bulkRemoveTagDialogOpen, setBulkRemoveTagDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<{
    isbn: string
    title: string
    currentStock: number
    activeRentals: number
    author?: string | null
    publisher?: string | null
  } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editDetailsBook, setEditDetailsBook] = useState<Book | null>(null)
  const [addStockCount, setAddStockCount] = useState(1)
  const [discardCount, setDiscardCount] = useState(1)
  const [discardNote, setDiscardNote] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([])
  const [selectedAddTagIds, setSelectedAddTagIds] = useState<number[]>([])
  const [selectedRemoveTagIds, setSelectedRemoveTagIds] = useState<number[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 25
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['books', pageIndex, searchQuery, selectedTagFilters],
    queryFn: async () => {
      const result = await window.api.books.getAll(
        pageIndex + 1,
        pageSize,
        'updatedAt',
        'desc',
        searchQuery || undefined,
        undefined,
        selectedTagFilters.length > 0 ? selectedTagFilters : undefined
      )
      return result as { books: Book[]; total: number }
    },
    staleTime: 30_000
  })

  const books = useMemo(() => data?.books ?? [], [data?.books])
  const totalBooks = data?.total ?? 0

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll(),
    staleTime: 30_000
  })

  const handleSearchChange = useSimpleDebouncedCallback((value: string) => {
    setSearchQuery(value)
    setPageIndex(0)
  }, 300)

  // Get selected ISBNs from rowSelection
  const selectedISBNs = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )

  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: (_data, isbn) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (isbns: string[]) => {
      return await window.api.books.bulkDelete(isbns)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setRowSelection({})
    }
  })

  const addStockMutation = useMutation({
    mutationFn: async ({ isbn, count }: { isbn: string; count: number }) => {
      return await window.api.books.addStock(isbn, count)
    },
    onSuccess: (_data, { isbn }) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setAddStockDialogOpen(false)
      setSelectedBook(null)
    }
  })

  const discardBooksMutation = useMutation({
    mutationFn: async ({ isbn, count, note }: { isbn: string; count: number; note?: string }) => {
      return await window.api.books.discardBooks(isbn, count, note)
    },
    onSuccess: (_data, { isbn }) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['discarded-books'] })
      setDiscardBooksDialogOpen(false)
      setSelectedBook(null)
    }
  })

  const updateTagsMutation = useMutation({
    mutationFn: async ({
      isbn,
      tagIds,
      title,
      author,
      publisher
    }: {
      isbn: string
      tagIds: number[]
      title: string
      author?: string | null
      publisher?: string | null
    }) => {
      await window.api.books.updateDetails(isbn, {
        title,
        author: author ?? undefined,
        publisher: publisher ?? undefined,
        tagIds
      })
    },
    onSuccess: (_data, { isbn }) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
    }
  })

  const bulkUpdateTagsMutation = useMutation({
    mutationFn: async ({ isbns, tagIds }: { isbns: string[]; tagIds: number[] }) => {
      return await window.api.books.bulkUpdateTags(isbns, tagIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setRowSelection({})
    }
  })

  const bulkAddTagMutation = useMutation({
    mutationFn: async ({ isbns, tagIds }: { isbns: string[]; tagIds: number[] }) => {
      return await window.api.books.bulkAddTag(isbns, tagIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setRowSelection({})
    }
  })

  const bulkRemoveTagMutation = useMutation({
    mutationFn: async ({ isbns, tagIds }: { isbns: string[]; tagIds: number[] }) => {
      return await window.api.books.bulkRemoveTag(isbns, tagIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setRowSelection({})
    }
  })

  const handleDelete = useCallback(
    async (isbn: string, title: string): Promise<void> => {
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
    },
    [deleteBookMutation, rowSelection]
  )

  const handleBulkDelete = async (): Promise<void> => {
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedISBNs.length} book(s)?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    try {
      await bulkDeleteMutation.mutateAsync(selectedISBNs)
    } catch (error) {
      console.error('Error deleting books:', error)
      toast.error('Failed to delete books. Please try again.')
    }
  }

  const handleAddStock = useCallback((isbn: string, title: string, currentStock: number): void => {
    setSelectedBook({ isbn, title, currentStock, activeRentals: 0 })
    setAddStockCount(1)
    setAddStockDialogOpen(true)
  }, [])

  const handleAddStockConfirm = async (): Promise<void> => {
    if (!selectedBook) return

    try {
      await addStockMutation.mutateAsync({ isbn: selectedBook.isbn, count: addStockCount })
    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('Failed to add stock. Please try again.')
    }
  }

  const handleDiscardBooks = useCallback(
    (isbn: string, title: string, currentStock: number, activeRentals: number): void => {
      setSelectedBook({ isbn, title, currentStock, activeRentals })
      setDiscardCount(1)
      setDiscardNote('')
      setDiscardBooksDialogOpen(true)
    },
    []
  )

  const handleDiscardBooksConfirm = async (): Promise<void> => {
    if (!selectedBook) return

    if (discardCount > selectedBook.currentStock - selectedBook.activeRentals) {
      toast.error(
        `Cannot discard ${discardCount} book(s). Only ${selectedBook.currentStock - selectedBook.activeRentals} book(s) available after active rentals.`
      )
      return
    }

    try {
      await discardBooksMutation.mutateAsync({
        isbn: selectedBook.isbn,
        count: discardCount,
        note: discardNote || undefined
      })
    } catch (error) {
      console.error('Error discarding books:', error)
      toast.error('Failed to discard books. Please try again.')
    }
  }

  const handleChangeTags = useCallback(
    (isbn: string, title: string, author?: string | null, publisher?: string | null): void => {
      const book = books.find((b) => b.isbn === isbn)
      setSelectedBook({
        isbn,
        title,
        currentStock: 0,
        activeRentals: 0,
        author: author ?? undefined,
        publisher: publisher ?? undefined
      })
      setSelectedTagIds(book?.bookTags?.map((bt) => bt.tag.id) || [])
      setChangeTagsDialogOpen(true)
    },
    [books]
  )

  const handleChangeTagsConfirm = async (): Promise<void> => {
    if (!selectedBook) return

    try {
      await updateTagsMutation.mutateAsync({
        isbn: selectedBook.isbn,
        tagIds: selectedTagIds,
        title: selectedBook.title,
        author: selectedBook.author,
        publisher: selectedBook.publisher
      })
      setChangeTagsDialogOpen(false)
      setSelectedBook(null)
      setSelectedTagIds([])
    } catch (error) {
      console.error('Error updating tags:', error)
      toast.error('Failed to update tags. Please try again.')
    }
  }

  const handleBulkChangeTags = (): void => {
    setSelectedTagIds([])
    setBulkChangeTagsDialogOpen(true)
  }

  const handleBulkChangeTagsConfirm = async (): Promise<void> => {
    try {
      await bulkUpdateTagsMutation.mutateAsync({ isbns: selectedISBNs, tagIds: selectedTagIds })
      setBulkChangeTagsDialogOpen(false)
      setSelectedTagIds([])
    } catch (error) {
      console.error('Error updating tags:', error)
      toast.error('Failed to update tags. Please try again.')
    }
  }

  const handleBulkAddTag = (): void => {
    setSelectedAddTagIds([])
    setBulkAddTagDialogOpen(true)
  }

  const handleBulkAddTagConfirm = async (): Promise<void> => {
    if (selectedAddTagIds.length === 0) return

    try {
      await bulkAddTagMutation.mutateAsync({ isbns: selectedISBNs, tagIds: selectedAddTagIds })
      setBulkAddTagDialogOpen(false)
      setSelectedAddTagIds([])
    } catch (error) {
      console.error('Error adding tag:', error)
      toast.error('Failed to add tag. Please try again.')
    }
  }

  const handleBulkRemoveTag = (): void => {
    setSelectedRemoveTagIds([])
    setBulkRemoveTagDialogOpen(true)
  }

  const handleBulkRemoveTagConfirm = async (): Promise<void> => {
    if (selectedRemoveTagIds.length === 0) return

    try {
      await bulkRemoveTagMutation.mutateAsync({
        isbns: selectedISBNs,
        tagIds: selectedRemoveTagIds
      })
      setBulkRemoveTagDialogOpen(false)
      setSelectedRemoveTagIds([])
    } catch (error) {
      console.error('Error removing tag:', error)
      toast.error('Failed to remove tag. Please try again.')
    }
  }

  const handleToggleTagFilter = (tagId: number): void => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
    setPageIndex(0)
  }

  const handleEditDetails = useCallback((book: Book): void => {
    setEditDetailsBook(book)
    setEditDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      getBooksColumns({
        onDelete: handleDelete,
        isDeleting: deleteBookMutation.isPending,
        onAddStock: handleAddStock,
        onDiscardBooks: handleDiscardBooks,
        onChangeTags: (isbn, title, author, publisher) =>
          handleChangeTags(isbn, title, author, publisher),
        onEditDetails: handleEditDetails,
        onTitleClick: (isbn) => {
          navigate({ to: '/books/$isbn', params: { isbn } })
        }
      }),
    [
      handleDelete,
      deleteBookMutation.isPending,
      handleAddStock,
      handleDiscardBooks,
      handleChangeTags,
      handleEditDetails,
      navigate
    ]
  )

  return (
    <div className="w-full">
      <PageTitle title="Manage Books" />
      <div className="flex items-center justify-between pb-4 gap-4">
        <div className="flex items-center gap-2">
          {selectedISBNs.length > 0 && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="size-4 mr-2" />
                Delete ({selectedISBNs.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkChangeTags}
                disabled={bulkUpdateTagsMutation.isPending}
              >
                <TagIcon className="size-4 mr-2" />
                Change Tags ({selectedISBNs.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkAddTag}
                disabled={bulkAddTagMutation.isPending}
              >
                <Plus className="size-4 mr-2" />
                Add Tags ({selectedISBNs.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRemoveTag}
                disabled={bulkRemoveTagMutation.isPending}
              >
                <Minus className="size-4 mr-2" />
                Remove Tags ({selectedISBNs.length})
              </Button>
            </>
          )}
        </div>
        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  selectedTagFilters.length > 0
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                    : ''
                }
              >
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
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setSelectedTagFilters([])}
                  >
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <DataTable
        columns={columns}
        data={books}
        searchPlaceholder="Search books..."
        pageSize={pageSize}
        initialSorting={[{ id: 'createdAt', desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(book) => book.isbn}
        manualPagination
        pageIndex={pageIndex}
        onPageChange={setPageIndex}
        pageCount={Math.ceil(totalBooks / pageSize)}
        total={totalBooks}
        onSearchChange={handleSearchChange}
        isLoading={isLoading}
      />

      {/* Add Books Dialog */}
      <Dialog
        open={addStockDialogOpen}
        onOpenChange={(open) => {
          setAddStockDialogOpen(open)
          if (!open) setSelectedBook(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Books</DialogTitle>
            <DialogDescription>
              Add copies for: {selectedBook?.title}
              <br />
              Current stock: {selectedBook?.currentStock}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addStockCount">Number of books to add</Label>
              <Input
                id="addStockCount"
                type="number"
                min={1}
                value={addStockCount}
                onChange={(e) => setAddStockCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddStockDialogOpen(false)
                setSelectedBook(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStockConfirm} disabled={addStockMutation.isPending}>
              {addStockMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Adding...
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Books Dialog */}
      <Dialog
        open={discardBooksDialogOpen}
        onOpenChange={(open) => {
          setDiscardBooksDialogOpen(open)
          if (!open) setSelectedBook(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Books</DialogTitle>
            <DialogDescription>
              Discard copies of: {selectedBook?.title}
              <br />
              Current stock: {selectedBook?.currentStock} | Active rentals:{' '}
              {selectedBook?.activeRentals}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="discardCount">Number of books to discard</Label>
              <Input
                id="discardCount"
                type="number"
                min={1}
                max={Math.max(
                  0,
                  (selectedBook?.currentStock || 0) - (selectedBook?.activeRentals || 0)
                )}
                value={discardCount}
                onChange={(e) => setDiscardCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            {discardCount >
              (selectedBook?.currentStock || 0) - (selectedBook?.activeRentals || 0) && (
              <div className="text-sm text-destructive">
                Cannot discard more than available stock after active rentals (
                {Math.max(
                  0,
                  (selectedBook?.currentStock || 0) - (selectedBook?.activeRentals || 0)
                )}
                ).
              </div>
            )}
            {discardCount === (selectedBook?.currentStock || 0) && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-md border border-red-200 dark:border-red-800">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Warning: This will discard all remaining copies of this book.</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="discardNote">Notes</Label>
              <textarea
                id="discardNote"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Reason for discarding..."
                value={discardNote}
                onChange={(e) => setDiscardNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDiscardBooksDialogOpen(false)
                setSelectedBook(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDiscardBooksConfirm}
              disabled={
                discardBooksMutation.isPending ||
                discardCount >
                  (selectedBook?.currentStock || 0) - (selectedBook?.activeRentals || 0)
              }
              variant="destructive"
            >
              {discardBooksMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Discarding...
                </>
              ) : (
                'Discard'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Tags Dialog */}
      <Dialog open={changeTagsDialogOpen} onOpenChange={setChangeTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tags</DialogTitle>
            <DialogDescription>Change tags for: {selectedBook?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <TagSelector selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeTagsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeTagsConfirm} disabled={updateTagsMutation.isPending}>
              {updateTagsMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Change Tags Dialog */}
      <Dialog open={bulkChangeTagsDialogOpen} onOpenChange={setBulkChangeTagsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Tags for Multiple Books</DialogTitle>
            <DialogDescription>
              Change tags for {selectedISBNs.length} selected book(s). This will replace all
              existing tags.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <TagSelector selectedTagIds={selectedTagIds} onTagsChange={setSelectedTagIds} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkChangeTagsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkChangeTagsConfirm}
              disabled={bulkUpdateTagsMutation.isPending}
            >
              {bulkUpdateTagsMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Tag Dialog */}
      <Dialog open={bulkAddTagDialogOpen} onOpenChange={setBulkAddTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags to Multiple Books</DialogTitle>
            <DialogDescription>
              Add tags to {selectedISBNs.length} selected book(s). Existing tags will be kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <TagSelector selectedTagIds={selectedAddTagIds} onTagsChange={setSelectedAddTagIds} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAddTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddTagConfirm}
              disabled={bulkAddTagMutation.isPending || selectedAddTagIds.length === 0}
            >
              {bulkAddTagMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Adding...
                </>
              ) : (
                'Add Tags'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Remove Tag Dialog */}
      <Dialog open={bulkRemoveTagDialogOpen} onOpenChange={setBulkRemoveTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Tags from Multiple Books</DialogTitle>
            <DialogDescription>
              Remove tags from {selectedISBNs.length} selected book(s). Other tags will be kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <TagSelector
              selectedTagIds={selectedRemoveTagIds}
              onTagsChange={setSelectedRemoveTagIds}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRemoveTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkRemoveTagConfirm}
              disabled={bulkRemoveTagMutation.isPending || selectedRemoveTagIds.length === 0}
            >
              {bulkRemoveTagMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Tags'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditBookDialog
        book={editDetailsBook}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  )
}
