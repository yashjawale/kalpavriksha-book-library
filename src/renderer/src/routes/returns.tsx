import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Spinner } from '@renderer/components/ui/spinner'
import PageTitle from '@renderer/components/ui/page-title'
import { DataTable } from '@renderer/components/ui/data-table'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { format, isToday, addWeeks } from 'date-fns'
import { ColumnDef, Row } from '@tanstack/react-table'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { toast } from 'sonner'

type LoanWithDetails = Awaited<
  ReturnType<typeof window.api.loans.getUpcomingReturns>
>['loans'][number]

export const Route = createFileRoute('/returns')({
  component: UpcomingReturns
})

function UpcomingReturns() {
  const queryClient = useQueryClient()

  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })

  useEffect(() => {
    window.api.auth.getStatus().then((status) => {
      setAuthStatus(status)
    })
  }, [])

  const [returnLoanId, setReturnLoanId] = useState<number | null>(null)
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)
  const [loanToExtend, setLoanToExtend] = useState<{ id: number; dueDate: Date | null } | null>(
    null
  )
  const [newDueDate, setNewDueDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-returns'],
    queryFn: async () => await window.api.loans.getUpcomingReturns(),
    enabled: authStatus.loggedIn,
    staleTime: 30_000
  })

  const returnBookMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const extendLoanMutation = useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: number; dueDate: Date }) => {
      return await window.api.loans.extendLoan(loanId, dueDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    }
  })

  const handleReturnAction = async () => {
    if (!returnLoanId) return
    try {
      await returnBookMutation.mutateAsync(returnLoanId)
      toast.success('Book marked as returned.')
    } catch (error) {
      console.error('Failed to return book:', error)
      toast.error('Failed to return book. Please try again.')
    } finally {
      setReturnLoanId(null)
    }
  }

  const handleOpenExtendDialog = useCallback((loan: { id: number; dueDate: Date | null }) => {
    setLoanToExtend(loan)
    const baseDate = loan.dueDate ? new Date(loan.dueDate) : new Date()
    setNewDueDate(format(addWeeks(baseDate, 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }, [])

  const handleExtendLoan = useCallback(async () => {
    if (!loanToExtend) return
    try {
      await extendLoanMutation.mutateAsync({
        loanId: loanToExtend.id,
        dueDate: new Date(newDueDate)
      })
      setExtensionDialogOpen(false)
      setLoanToExtend(null)
    } catch (error) {
      console.error('Failed to extend loan:', error)
      toast.error('Failed to extend loan. Please try again.')
    }
  }, [loanToExtend, newDueDate, extendLoanMutation])

  const columns = useMemo<ColumnDef<LoanWithDetails>[]>(
    () => [
      {
        accessorKey: 'borrower',
        header: 'Name',
        cell: ({ row }) => {
          const borrower = row.original.borrower
          return (
            <div className="flex flex-col">
              <Link
                to="/users/$email"
                params={{ email: borrower.email }}
                className="hover:underline text-primary font-medium truncate"
                title={borrower.name || 'Unknown User'}
              >
                {borrower.name || 'Unknown User'}
              </Link>
              <span className="text-xs text-muted-foreground truncate" title={borrower.email}>
                {borrower.email}
              </span>
            </div>
          )
        }
      },
      {
        accessorKey: 'book',
        header: 'Book',
        cell: ({ row }) => {
          const book = row.original.book
          return (
            <div className="flex flex-col">
              <Link
                to="/books/$isbn"
                params={{ isbn: row.original.bookIsbn }}
                className="font-medium line-clamp-1 hover:underline text-primary"
                title={book.title}
              >
                {book.title}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">{book.isbn}</span>
            </div>
          )
        }
      },
      {
        accessorKey: 'dueDate',
        header: 'Expected return date',
        cell: ({ row }) => {
          const dueDate = row.original.dueDate
          if (!dueDate) return <span className="text-muted-foreground">None</span>

          const date = new Date(dueDate)
          const isPastDue = date < new Date() && date.toDateString() !== new Date().toDateString()

          return (
            <span className={isPastDue ? 'text-destructive font-medium' : ''}>
              {format(date, 'MMM d, yyyy')}
              {isPastDue && ' (Overdue)'}
            </span>
          )
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const loan = row.original
          return (
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReturnLoanId(loan.id)}
                disabled={returnBookMutation.isPending}
              >
                Mark as returned
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenExtendDialog(loan)}
                disabled={extendLoanMutation.isPending}
              >
                Extend
              </Button>
            </div>
          )
        }
      }
    ],
    [
      setReturnLoanId,
      returnBookMutation.isPending,
      extendLoanMutation.isPending,
      handleOpenExtendDialog
    ]
  )

  const globalFilterFn = (loan: LoanWithDetails, filterValue: string): boolean => {
    const searchLower = filterValue.toLowerCase()
    const matchesUser =
      loan.borrower.name?.toLowerCase().includes(searchLower) ||
      loan.borrower.email?.toLowerCase().includes(searchLower)
    const matchesBook = loan.book.title.toLowerCase().includes(searchLower)
    return matchesUser || matchesBook
  }

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view upcoming returns." />
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  const rowClassName = (row: Row<LoanWithDetails>) => {
    const dueDate = row.original.dueDate
    if (!dueDate) return ''
    const date = new Date(dueDate)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    if (date < startOfToday) {
      return 'bg-red-50 hover:bg-red-100/50 dark:bg-red-900/20 dark:hover:bg-red-900/30'
    }
    if (isToday(date)) {
      return 'bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30'
    }
    return ''
  }

  return (
    <div className="w-full">
      <PageTitle title="Upcoming returns" />

      <DataTable
        columns={columns}
        data={(data?.loans as LoanWithDetails[]) || []}
        pageSize={25}
        searchPlaceholder="Search by name, book or email"
        globalFilterFn={globalFilterFn}
        rowClassName={rowClassName}
      />

      <Dialog
        open={extensionDialogOpen}
        onOpenChange={(open) => {
          setExtensionDialogOpen(open)
          if (!open) setLoanToExtend(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Loan Due Date</DialogTitle>
            <DialogDescription>Set a new due date for this loan.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtensionDialogOpen(false)
                setLoanToExtend(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleExtendLoan} disabled={extendLoanMutation.isPending}>
              {extendLoanMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" /> Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnLoanId} onOpenChange={(open) => !open && setReturnLoanId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark book as returned?</DialogTitle>
            <DialogDescription>
              This will close the active rental and return the book to the available stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnLoanId(null)}>
              Cancel
            </Button>
            <Button onClick={handleReturnAction} disabled={returnBookMutation.isPending}>
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
