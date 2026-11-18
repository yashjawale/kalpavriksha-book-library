import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import { Button } from '@renderer/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable } from '@renderer/components/ui/data-table'
import { format } from 'date-fns'
import PageTitle from '@renderer/components/ui/page-title'
import type { ColumnDef, Row } from '@tanstack/react-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'

export const Route = createFileRoute('/rentals/')({
  component: RentalsPage
})

type ActiveLoan = {
  id: number
  bookIsbn: string
  borrowedAt: Date
  dueDate: Date | null
  returnedAt: Date | null
  userEmail: string
  createdAt: Date
  updatedAt: Date
  book?: { title: string; isbn: string }
  borrower?: { name: string | null; email: string }
}

function RentalsPage() {
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({ loggedIn: false })

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
  }, [])

  const [returnLoanId, setReturnLoanId] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const { data: activeLoans = [], isLoading } = useQuery<ActiveLoan[]>({
    queryKey: ['loans', 'active'],
    queryFn: async () => await window.api.loans.getAllActive(),
    staleTime: 30_000
  })

  const handleReturnAction = async () => {
    if (!returnLoanId) return
    try {
      await window.api.loans.returnBook(returnLoanId)
      toast.success('Book marked as returned.')
      queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['returns-today'] })
    } catch (err) {
      console.error(err)
      toast.error('Failed to return book.')
    } finally {
      setReturnLoanId(null)
    }
  }

  const globalFilterFn = (loan: ActiveLoan, filterValue: string): boolean => {
    const s = filterValue.toLowerCase()
    const bookTitle = (loan.book?.title || loan.bookIsbn).toLowerCase()
    const userName = (loan.borrower?.name || '').toLowerCase()
    const userEmail = (loan.userEmail || '').toLowerCase()
    return bookTitle.includes(s) || userName.includes(s) || userEmail.includes(s)
  }

  const columns = useMemo<ColumnDef<ActiveLoan>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.borrower?.name || row.userEmail,
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              to="/users/$email"
              params={{ email: row.original.userEmail }}
              className="hover:underline text-primary font-medium truncate"
              title={row.original.borrower?.name || 'Unknown'}
            >
              {row.original.borrower?.name || 'Unknown'}
            </Link>
            <span className="text-xs text-muted-foreground truncate" title={row.original.userEmail}>
              {row.original.userEmail}
            </span>
          </div>
        )
      },
      {
        id: 'book',
        accessorFn: (row) => row.book?.title || row.bookIsbn,
        header: 'Book',
        cell: ({ row }) => (
          <Link
            to="/books/$isbn"
            params={{ isbn: row.original.bookIsbn }}
            className="hover:underline text-primary truncate block"
            title={row.original.book?.title || row.original.bookIsbn}
          >
            {row.original.book?.title || row.original.bookIsbn}
          </Link>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const dueDateObj = row.original.dueDate ? new Date(row.original.dueDate) : null
          const startOfToday = new Date()
          startOfToday.setHours(0, 0, 0, 0)
          const isOverdue = dueDateObj && dueDateObj < startOfToday
          if (isOverdue) {
            return (
              <span className="text-red-800 font-medium text-xs bg-red-100/70 px-2 py-1 rounded dark:bg-red-900/20 dark:text-red-400">
                Overdue
              </span>
            )
          }
          return (
            <span className="text-[color-mix(in_oklab,var(--primary)_65%,black)] font-medium text-xs bg-primary/15 px-2 py-1 rounded">
              Active
            </span>
          )
        }
      },
      {
        id: 'returnDate',
        header: 'Return date',
        cell: ({ row }) =>
          row.original.dueDate ? format(new Date(row.original.dueDate), 'dd/MM/yy') : 'Not Set'
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-primary text-primary font-medium transition-colors hover:bg-primary hover:text-white"
              asChild
            >
              <Link to="/users/$email" params={{ email: row.original.userEmail }}>
                View details
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
              onClick={() => setReturnLoanId(row.original.id)}
            >
              Mark Returned
            </Button>
          </div>
        )
      }
    ],
    [setReturnLoanId]
  )

  const rowClassName = (row: Row<ActiveLoan>): string => {
    const dueDateObj = row.original.dueDate ? new Date(row.original.dueDate) : null
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const isOverdue = dueDateObj && dueDateObj < startOfToday
    const isDueToday = dueDateObj && dueDateObj.toDateString() === new Date().toDateString()
    if (isOverdue)
      return 'bg-red-50 hover:bg-red-100/50 dark:bg-red-900/20 dark:hover:bg-red-900/30'
    if (isDueToday)
      return 'bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30'
    return ''
  }

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view loans." />
  }

  return (
    <div className="w-full">
      <PageTitle title="Active Loans" />

      <DataTable
        columns={columns}
        data={activeLoans}
        searchPlaceholder="Search by book, name or email..."
        searchContainerClassName="max-w-xl"
        toolbarRight={
          <Button className="font-semibold" asChild>
            <Link to="/rentals/new">
              <PlusIcon /> Issue Book
            </Link>
          </Button>
        }
        pageSize={25}
        globalFilterFn={globalFilterFn}
        rowClassName={rowClassName}
        isLoading={isLoading}
        getRowId={(loan) => String(loan.id)}
      />

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
            <Button onClick={handleReturnAction}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
