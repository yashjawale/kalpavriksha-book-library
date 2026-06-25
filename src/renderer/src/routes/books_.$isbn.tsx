import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@renderer/components/ui/spinner'
import { Button } from '@renderer/components/ui/button'
import { Pencil, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import PageTitle from '@renderer/components/ui/page-title'
import { TagBadge } from '@renderer/components/TagBadge'

export const Route = createFileRoute('/books_/$isbn')({
  component: SingleBook
})

function SingleBook() {
  const { isbn } = Route.useParams()
  const queryClient = useQueryClient()

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', isbn],
    queryFn: async () => await window.api.books.getBookDetails(isbn)
  })

  const returnBookMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
    }
  })

  const extendLoanMutation = useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: number; dueDate: Date }) => {
      return await window.api.loans.extendLoan(loanId, dueDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
    }
  })

  const handleReturn = async (loanId: number) => {
    try {
      await returnBookMutation.mutateAsync(loanId)
    } catch (error) {
      console.error('Failed to return book:', error)
      alert('Failed to return book. Please try again.')
    }
  }

  const handleExtend = async (loanId: number, currentDueDate: Date | null) => {
    const baseDate = currentDueDate ? new Date(currentDueDate) : new Date()
    const newDueDate = new Date(baseDate)
    newDueDate.setDate(newDueDate.getDate() + 14)

    try {
      await extendLoanMutation.mutateAsync({ loanId, dueDate: newDueDate })
    } catch (error) {
      console.error('Failed to extend loan:', error)
      alert('Failed to extend loan. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Book not found</h2>
        <Button asChild variant="outline">
          <Link to="/books">Return to Manage Books</Link>
        </Button>
      </div>
    )
  }

  const activeLoans = book.loans.filter((loan) => !loan.returnedAt)
  const pastLoans = book.loans.filter((loan) => loan.returnedAt)
  const availableStock = book.totalStock - activeLoans.length

  return (
    <div className="w-full space-y-8 pb-12">
      <div className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-fit">
        <Link to="/books" className="flex items-center gap-2">
          <ArrowLeft className="size-4" />
          All Books
        </Link>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <PageTitle title={book.title} />
            {/* The wireframe asks for an edit dialog for all fields. For now, we'll just have the button.
                Actually implementing the full edit dialog might require a new component, we can add it later or a placeholder. */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => alert('Edit dialog not yet implemented')}
            >
              <Pencil className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            {book.author && (
              <>
                <span>{book.author}</span>
                <span>•</span>
              </>
            )}
            {book.publisher && (
              <>
                <span>{book.publisher}</span>
                <span>•</span>
              </>
            )}
            <span className="font-mono text-sm">{book.isbn}</span>
          </div>

          {book.bookTags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {book.bookTags.map((bt) => (
                // <Badge key={bt.tag.id} variant="secondary">
                //   {bt.tag.name}
                // </Badge>
                <TagBadge key={bt.tag.id} tag={bt.tag} />
              ))}
            </div>
          )}
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-sm font-medium text-muted-foreground mb-1">Stock</div>
          <div className="text-3xl font-bold">
            {availableStock}/{book.totalStock}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Active rentals</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">User name</th>
                <th className="h-10 px-4 text-left font-medium">Email</th>
                <th className="h-10 px-4 text-left font-medium">Expected return</th>
                <th className="h-10 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeLoans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    No active rentals.
                  </td>
                </tr>
              ) : (
                activeLoans.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{loan.borrower.name || '-'}</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {loan.borrower.email}
                    </td>
                    <td className="p-4 align-middle">
                      {loan.dueDate ? format(new Date(loan.dueDate), 'MMM d, yyyy') : 'None'}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturn(loan.id)}
                          disabled={returnBookMutation.isPending}
                        >
                          Mark as returned
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtend(loan.id, loan.dueDate)}
                          disabled={extendLoanMutation.isPending}
                        >
                          Extend
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Past rentals</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-10 px-4 text-left font-medium">User name</th>
                <th className="h-10 px-4 text-left font-medium">Email</th>
                <th className="h-10 px-4 text-left font-medium">Returned on</th>
              </tr>
            </thead>
            <tbody>
              {pastLoans.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    No past rentals.
                  </td>
                </tr>
              ) : (
                pastLoans.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{loan.borrower.name || '-'}</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {loan.borrower.email}
                    </td>
                    <td className="p-4 align-middle">
                      {loan.returnedAt ? format(new Date(loan.returnedAt), 'MMM d, yyyy') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
