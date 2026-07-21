import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { Spinner } from '@renderer/components/ui/spinner'
import PageTitle from '@renderer/components/ui/page-title'
import { DataTable } from '@renderer/components/ui/data-table'
import { Button } from '@renderer/components/ui/button'
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
import { CheckCircle2, Circle } from 'lucide-react'
import { isToday } from 'date-fns'

type LoanWithDetails = Awaited<ReturnType<typeof window.api.loans.getReturnsToday>>['loans'][number]

export const Route = createFileRoute('/returns-today')({
  component: ReturnsToday
})

function ReturnsToday() {
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

  const { data, isLoading } = useQuery({
    queryKey: ['returns-today'],
    queryFn: async () => await window.api.loans.getReturnsToday(),
    enabled: authStatus.loggedIn
  })

  const returnBookMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns-today'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
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
                className="hover:underline font-medium"
              >
                {borrower.name || 'Unknown User'}
              </Link>
              <span className="text-xs text-muted-foreground">{borrower.email}</span>
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
                className="font-medium line-clamp-1 hover:underline"
                title={book?.title}
              >
                {book?.title || 'Unknown Book'}
              </Link>
              <span className="text-xs text-muted-foreground font-mono">
                {row.original.bookIsbn}
              </span>
            </div>
          )
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const isReturned = !!row.original.returnedAt
          return (
            <div className="flex items-center gap-2">
              {isReturned ? (
                <>
                  <CheckCircle2 className="size-4 text-green-500" />
                  <span className="text-green-600 font-medium">Returned</span>
                </>
              ) : (
                <>
                  <Circle className="size-4 text-yellow-500" />
                  <span className="text-yellow-600 font-medium">Pending</span>
                </>
              )}
            </div>
          )
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const loan = row.original
          const isReturned = !!loan.returnedAt

          if (isReturned) return null

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
            </div>
          )
        }
      }
    ],
    [setReturnLoanId, returnBookMutation.isPending]
  )

  const globalFilterFn = (loan: LoanWithDetails, filterValue: string): boolean => {
    const searchLower = filterValue.toLowerCase()
    const matchesUser =
      loan.borrower.name?.toLowerCase().includes(searchLower) ||
      loan.borrower.email?.toLowerCase().includes(searchLower)
    const matchesBook = loan.book?.title.toLowerCase().includes(searchLower)
    return matchesUser || !!matchesBook
  }

  const rowClassName = (row: Row<LoanWithDetails>) => {
    if (row.original.returnedAt) return ''
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

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view today's returns." />
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageTitle title="Today's returns" />

      <DataTable
        columns={columns}
        data={(data?.loans as LoanWithDetails[]) || []}
        pageSize={25}
        searchPlaceholder="Search by name, book or email"
        globalFilterFn={globalFilterFn}
        rowClassName={rowClassName}
      />

      <Dialog open={!!returnLoanId} onOpenChange={(open) => !open && setReturnLoanId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark book as returned?</DialogTitle>
            <DialogDescription>
              This will close the active loans and return the book to the available stock.
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
