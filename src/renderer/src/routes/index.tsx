import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'

export const Route = createFileRoute('/')({
  component: Index
})

function Index() {
  // Fetch books using the exposed API
  const {
    data: books,
    isLoading,
    error
  } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      return await window.api.books.getAll()
    }
  })

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Book Library</h1>

      {isLoading && <div>Loading books...</div>}

      {error && <div className="text-red-500">Error loading books: {error.message}</div>}

      {books && books.length === 0 && <div>No books found</div>}

      {books && books.length > 0 && (
        <div className="space-y-2">
          {books.map((book) => (
            <div key={book.isbn} className="border p-4 rounded">
              <h3 className="font-semibold">{book.title}</h3>
              <p className="text-sm text-gray-600">ISBN: {book.isbn}</p>
              <p className="text-sm">Stock: {book.totalStock}</p>
            </div>
          ))}
        </div>
      )}
      <Button>Hello</Button>
    </>
  )
}
