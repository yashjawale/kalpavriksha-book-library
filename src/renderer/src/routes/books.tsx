import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
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
import { Spinner } from '@renderer/components/ui/spinner'
import { Trash2, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import type { Book } from '@renderer/types/book'

export const Route = createFileRoute('/books')({
  component: BooksPage
})

type SortField = 'title' | 'isbn' | 'totalStock' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function BooksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const itemsPerPage = 25
  const queryClient = useQueryClient()

  const { data: allBooks = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => await window.api.books.getAll()
  })

  const deleteBookMutation = useMutation({
    mutationFn: async (isbn: string) => {
      return await window.api.books.delete(isbn)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  // Filter and sort books
  const filteredAndSortedBooks = useMemo(() => {
    const filtered = allBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.publisher?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortOrder === 'asc' ? -1 : 1
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1

      // Handle Date objects
      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime()
        bValue = bValue.getTime()
      }

      // Handle strings and numbers
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

    return filtered
  }, [allBooks, searchQuery, sortField, sortOrder])

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedBooks.length / itemsPerPage)
  const paginatedBooks = filteredAndSortedBooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

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
            <CardTitle>Manage Books</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('title')}
                    className="hover:bg-transparent"
                  >
                    Title
                    <ArrowUpDown className="ml-2 size-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-40">Author</TableHead>
                <TableHead className="w-40">Publisher</TableHead>
                <TableHead className="w-40">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('isbn')}
                    className="hover:bg-transparent"
                  >
                    ISBN
                    <ArrowUpDown className="ml-2 size-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-32">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('totalStock')}
                    className="hover:bg-transparent"
                  >
                    Stock
                    <ArrowUpDown className="ml-2 size-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-40">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('createdAt')}
                    className="hover:bg-transparent"
                  >
                    Date Added
                    <ArrowUpDown className="ml-2 size-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-25">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {searchQuery
                      ? 'No books found matching your search.'
                      : 'No books found. Add some books first.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBooks.map((book) => (
                  <TableRow key={book.isbn}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {book.author || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {book.publisher || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{book.isbn}</TableCell>
                    <TableCell>{book.totalStock}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(book.createdAt).toLocaleDateString('en-IN')}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredAndSortedBooks.length)} of{' '}
                {filteredAndSortedBooks.length} books
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
