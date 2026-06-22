import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@renderer/components/ui/spinner'
import type { Book, Tag } from '@renderer/types/book'
import { DataTable } from '@renderer/components/ui/data-table'
import { getBooksColumns } from '@renderer/components/columns/books-columns'
import PageTitle from '@renderer/components/ui/page-title'
import { useState, useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Trash2, Tag as TagIcon, Plus, Minus } from 'lucide-react'
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

export const Route = createFileRoute('/books')({
  component: ManageBooks
})

function ManageBooks() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [changeTagsDialogOpen, setChangeTagsDialogOpen] = useState(false)
  const [bulkChangeTagsDialogOpen, setBulkChangeTagsDialogOpen] = useState(false)
  const [bulkAddTagDialogOpen, setBulkAddTagDialogOpen] = useState(false)
  const [bulkRemoveTagDialogOpen, setBulkRemoveTagDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<{
    isbn: string
    title: string
    currentStock: number
  } | null>(null)
  const [stockToAdd, setStockToAdd] = useState(1)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([])
  const [selectedAddTagIds, setSelectedAddTagIds] = useState<number[]>([])
  const [selectedRemoveTagIds, setSelectedRemoveTagIds] = useState<number[]>([])

  const { data: allBooks = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    // Fetch all books without pagination limits for client-side filtering
    queryFn: async () => await window.api.books.getAll(1, Number.MAX_SAFE_INTEGER)
  })

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  // Filter books by selected tags
  const filteredBooks = useMemo(() => {
    if (selectedTagFilters.length === 0) return allBooks
    return allBooks.filter((book) => {
      if (!book.bookTags || book.bookTags.length === 0) return false
      return selectedTagFilters.some((tagId) => book.bookTags!.some((bt) => bt.tag.id === tagId))
    })
  }, [allBooks, selectedTagFilters])

  // Get selected ISBNs from rowSelection
  const selectedISBNs = useMemo(
    () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
    [rowSelection]
  )

  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (isbns: string[]) => {
      return await window.api.books.bulkDelete(isbns)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setRowSelection({})
    }
  })

  const updateStockMutation = useMutation({
    mutationFn: async ({ isbn, newStock }: { isbn: string; newStock: number }) => {
      return await window.api.books.updateStock(isbn, newStock)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const updateTagsMutation = useMutation({
    mutationFn: async ({ isbn, tagIds }: { isbn: string; tagIds: number[] }) => {
      // First remove all tags, then add the new ones
      const book = allBooks.find((b) => b.isbn === isbn)
      if (book?.bookTags) {
        for (const bt of book.bookTags) {
          await window.api.tags.removeTagFromBook(isbn, bt.tag.id)
        }
      }
      if (tagIds.length > 0) {
        await window.api.tags.addTagsToBook(isbn, tagIds)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const bulkUpdateTagsMutation = useMutation({
    mutationFn: async ({ isbns, tagIds }: { isbns: string[]; tagIds: number[] }) => {
      return await window.api.books.bulkUpdateTags(isbns, tagIds)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
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
      alert('Failed to delete book. Please try again.')
    }
  }

  const handleBulkDelete = async (): Promise<void> => {
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedISBNs.length} book(s)?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    try {
      await bulkDeleteMutation.mutateAsync(selectedISBNs)
    } catch (error) {
      console.error('Error deleting books:', error)
      alert('Failed to delete books. Please try again.')
    }
  }

  const handleAddStock = (isbn: string, title: string, currentStock: number): void => {
    setSelectedBook({ isbn, title, currentStock })
    setStockToAdd(1)
    setAddStockDialogOpen(true)
  }

  const handleAddStockConfirm = async (): Promise<void> => {
    if (!selectedBook) return

    try {
      const newStock = selectedBook.currentStock + stockToAdd
      await updateStockMutation.mutateAsync({ isbn: selectedBook.isbn, newStock })
      setAddStockDialogOpen(false)
      setSelectedBook(null)
      setStockToAdd(1)
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Failed to update stock. Please try again.')
    }
  }

  const handleChangeTags = (isbn: string, title: string): void => {
    const book = allBooks.find((b) => b.isbn === isbn)
    setSelectedBook({ isbn, title, currentStock: 0 })
    setSelectedTagIds(book?.bookTags?.map((bt) => bt.tag.id) || [])
    setChangeTagsDialogOpen(true)
  }

  const handleChangeTagsConfirm = async (): Promise<void> => {
    if (!selectedBook) return

    try {
      await updateTagsMutation.mutateAsync({ isbn: selectedBook.isbn, tagIds: selectedTagIds })
      setChangeTagsDialogOpen(false)
      setSelectedBook(null)
      setSelectedTagIds([])
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('Failed to update tags. Please try again.')
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
      alert('Failed to update tags. Please try again.')
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
      alert('Failed to add tag. Please try again.')
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
      alert('Failed to remove tag. Please try again.')
    }
  }

  const handleToggleTagFilter = (tagId: number): void => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const columns = getBooksColumns({
    onDelete: handleDelete,
    isDeleting: deleteBookMutation.isPending,
    onAddStock: handleAddStock,
    onChangeTags: handleChangeTags,
    onTitleClick: (isbn) => {
      navigate({ to: '/books/$isbn', params: { isbn } })
    }
  })

  // Global filter function for searching across multiple fields
  const globalFilterFn = (book: Book, filterValue: string): boolean => {
    const searchLower = filterValue.toLowerCase()
    const matchesText =
      book.title.toLowerCase().includes(searchLower) ||
      book.isbn.toLowerCase().includes(searchLower) ||
      book.author?.toLowerCase().includes(searchLower) ||
      book.publisher?.toLowerCase().includes(searchLower)

    // Also search in tags
    const matchesTags = book.bookTags?.some((bt) => bt.tag.name.toLowerCase().includes(searchLower))

    return matchesText || Boolean(matchesTags)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

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
      </div>
      <DataTable
        columns={columns}
        data={filteredBooks}
        searchPlaceholder="Search books..."
        pageSize={25}
        globalFilterFn={globalFilterFn}
        initialSorting={[{ id: 'createdAt', desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(book) => book.isbn}
      />

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
            <DialogDescription>
              Add stock to: {selectedBook?.title}
              <br />
              Current stock: {selectedBook?.currentStock}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stockToAdd">Stock to Add</Label>
              <Input
                id="stockToAdd"
                type="number"
                min="1"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              New stock will be: {(selectedBook?.currentStock || 0) + stockToAdd}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStockConfirm} disabled={updateStockMutation.isPending}>
              {updateStockMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Updating...
                </>
              ) : (
                'Confirm'
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
    </div>
  )
}
