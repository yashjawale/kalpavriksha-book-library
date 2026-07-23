import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@renderer/components/ui/spinner'
import { Button } from '@renderer/components/ui/button'
import { Pencil, ArrowLeft, AlertTriangle } from 'lucide-react'
import { format, isToday } from 'date-fns'
import PageTitle from '@renderer/components/ui/page-title'
import { TagBadge } from '@renderer/components/TagBadge'
import { EditBookDialog } from '@renderer/components/EditBookDialog'
import { useState, useMemo } from 'react'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { toast } from 'sonner'
import { PaginationBar } from '@renderer/components/ui/pagination-bar'

export const Route = createFileRoute('/books/$isbn')({
  component: SingleBook
})

function SingleBook() {
  const { isbn } = Route.useParams()
  const queryClient = useQueryClient()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false)
  const [discardBooksDialogOpen, setDiscardBooksDialogOpen] = useState(false)
  const [addStockCount, setAddStockCount] = useState(1)
  const [discardCount, setDiscardCount] = useState(1)
  const [discardNote, setDiscardNote] = useState('')

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', isbn],
    queryFn: async () => await window.api.books.getBookDetails(isbn),
    staleTime: 30_000
  })

  const returnBookMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['returns-today'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const extendLoanMutation = useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: number; dueDate: Date }) => {
      return await window.api.loans.extendLoan(loanId, dueDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['returns-today'] })
    }
  })

  const addStockMutation = useMutation({
    mutationFn: async (count: number) => {
      return await window.api.books.addStock(isbn, count)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setAddStockDialogOpen(false)
    }
  })

  const discardBooksMutation = useMutation({
    mutationFn: async ({ count, note }: { count: number; note?: string }) => {
      return await window.api.books.discardBooks(isbn, count, note)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', isbn] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['discarded-books'] })
      setDiscardBooksDialogOpen(false)
    }
  })

  const handleReturn = async (loanId: number) => {
    try {
      await returnBookMutation.mutateAsync(loanId)
    } catch (error) {
      console.error('Failed to return book:', error)
      toast.error('Failed to return book. Please try again.')
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
      toast.error('Failed to extend loan. Please try again.')
    }
  }

  const handleAddStockConfirm = async (): Promise<void> => {
    if (!book) return

    try {
      await addStockMutation.mutateAsync(addStockCount)
    } catch (error) {
      console.error('Error adding stock:', error)
      toast.error('Failed to add stock. Please try again.')
    }
  }

  const handleDiscardBooksConfirm = async (): Promise<void> => {
    if (!book) return

    const activeLoansCount = book.loans.filter((loan) => !loan.returnedAt).length
    if (discardCount > book.totalStock - activeLoansCount) {
      toast.error(
        `Cannot discard ${discardCount} book(s). Only ${book.totalStock - activeLoansCount} book(s) available after active rentals.`
      )
      return
    }

    try {
      await discardBooksMutation.mutateAsync({
        count: discardCount,
        note: discardNote || undefined
      })
    } catch (error) {
      console.error('Error discarding books:', error)
      toast.error('Failed to discard books. Please try again.')
    }
  }

  const [pastLoansPage, setPastLoansPage] = useState(1)
  const pastLoansPerPage = 10
  const pastLoans = (book?.loans || []).filter((loan) => loan.returnedAt)
  const paginatedPastLoans = useMemo(
    () => pastLoans.slice((pastLoansPage - 1) * pastLoansPerPage, pastLoansPage * pastLoansPerPage),
    [pastLoans, pastLoansPage, pastLoansPerPage]
  )
  const totalPastLoansPages = Math.ceil(pastLoans.length / pastLoansPerPage) || 1

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
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setEditDialogOpen(true)}
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
          <div className="text-3xl font-bold mb-2">
            {availableStock}/{book.totalStock}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddStockCount(1)
                setAddStockDialogOpen(true)
              }}
            >
              <svg
                className="mr-1 size-3"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Add Books
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDiscardCount(1)
                setDiscardNote('')
                setDiscardBooksDialogOpen(true)
              }}
            >
              <svg
                className="mr-1 size-3"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              Discard
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Currently Issued</h2>
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
                    No active loans.
                  </td>
                </tr>
              ) : (
                activeLoans.map((loan) => {
                  const dueDateObj = loan.dueDate ? new Date(loan.dueDate) : null
                  const startOfToday = new Date()
                  startOfToday.setHours(0, 0, 0, 0)
                  const isOverdue = dueDateObj && dueDateObj < startOfToday
                  const dueToday = dueDateObj && isToday(dueDateObj)
                  return (
                    <tr
                      key={loan.id}
                      className={`border-b last:border-0 hover:bg-muted/50 ${isOverdue ? 'bg-red-50 hover:bg-red-100/50 dark:bg-red-900/20 dark:hover:bg-red-900/30' : dueToday ? 'bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30' : ''}`}
                    >
                      <td className="p-4 align-middle font-medium max-w-40">
                        <Link
                          to="/users/$email"
                          params={{ email: loan.borrower.email }}
                          className="hover:underline truncate block"
                          title={loan.borrower.name || '-'}
                        >
                          {loan.borrower.name || '-'}
                        </Link>
                      </td>
                      <td
                        className="p-4 align-middle text-muted-foreground truncate max-w-48"
                        title={loan.borrower.email}
                      >
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Past loans</h2>
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
                    No past loans.
                  </td>
                </tr>
              ) : (
                paginatedPastLoans.map((loan) => (
                  <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium max-w-40">
                      <Link
                        to="/users/$email"
                        params={{ email: loan.borrower.email }}
                        className="hover:underline truncate block"
                        title={loan.borrower.name || '-'}
                      >
                        {loan.borrower.name || '-'}
                      </Link>
                    </td>
                    <td
                      className="p-4 align-middle text-muted-foreground truncate max-w-48"
                      title={loan.borrower.email}
                    >
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
        <PaginationBar
          currentPage={pastLoansPage - 1}
          totalPages={totalPastLoansPages}
          onPageChange={(p) => setPastLoansPage(p + 1)}
        />
      </div>

      <EditBookDialog book={book} open={editDialogOpen} onOpenChange={setEditDialogOpen} />

      {/* Add Books Dialog */}
      <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Books</DialogTitle>
            <DialogDescription>
              Add copies for: {book.title}
              <br />
              Current stock: {book.totalStock}
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
            <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>
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
      <Dialog open={discardBooksDialogOpen} onOpenChange={setDiscardBooksDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Books</DialogTitle>
            <DialogDescription>
              Discard copies of: {book.title}
              <br />
              Current stock: {book.totalStock} | Active rentals: {activeLoans.length}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="discardCount">Number of books to discard</Label>
              <Input
                id="discardCount"
                type="number"
                min={1}
                max={Math.max(0, book.totalStock - activeLoans.length)}
                value={discardCount}
                onChange={(e) => setDiscardCount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            {discardCount > book.totalStock - activeLoans.length && (
              <div className="text-sm text-destructive">
                Cannot discard more than available stock after active rentals (
                {Math.max(0, book.totalStock - activeLoans.length)}).
              </div>
            )}
            {discardCount === book.totalStock && (
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
            <Button variant="outline" onClick={() => setDiscardBooksDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDiscardBooksConfirm}
              disabled={
                discardBooksMutation.isPending ||
                discardCount > book.totalStock - activeLoans.length
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
    </div>
  )
}
