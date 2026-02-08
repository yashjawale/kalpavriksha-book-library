import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Spinner } from '@renderer/components/ui/spinner'
import type { Book } from '@renderer/types/book'
import { DataTable } from '@renderer/components/ui/data-table'
import { getBooksColumns } from '@renderer/components/columns/books-columns'

export const Route = createFileRoute('/')({
  component: ManageBooks
})

export default function ManageBooks() {
  const queryClient = useQueryClient()

  const { data: allBooks = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    // Fetch all books without pagination limits for client-side filtering
    queryFn: async () => await window.api.books.getAll(1, Number.MAX_SAFE_INTEGER)
  })

  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const handleDelete = async (isbn: string, title: string): Promise<void> => {
    const confirmed = confirm(
      `Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`
    )
    if (!confirmed) return

    try {
      await deleteBookMutation.mutateAsync(isbn)
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Failed to delete book. Please try again.')
    }
  }

  const columns = getBooksColumns({
    onDelete: handleDelete,
    isDeleting: deleteBookMutation.isPending
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
      <Card>
        <CardHeader>
          <CardTitle>Manage Books</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={allBooks}
            searchPlaceholder="Search books..."
            pageSize={25}
            globalFilterFn={globalFilterFn}
            initialSorting={[{ id: 'createdAt', desc: true }]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
