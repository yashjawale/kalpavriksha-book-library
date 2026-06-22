import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@renderer/components/ui/spinner'
import PageTitle from '@renderer/components/ui/page-title'
import { DataTable } from '@renderer/components/ui/data-table'
import { Button } from '@renderer/components/ui/button'
import { format } from 'date-fns'
import { ColumnDef } from '@tanstack/react-table'

type LoanWithDetails = Awaited<
  ReturnType<typeof window.api.loans.getUpcomingReturns>
>['loans'][number]

export const Route = createFileRoute('/returns')({
  component: UpcomingReturns
})

function UpcomingReturns() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-returns'],
    queryFn: async () => await window.api.loans.getUpcomingReturns(1, Number.MAX_SAFE_INTEGER)
  })

  const returnBookMutation = useMutation({
    mutationFn: async (loanId: number) => {
      return await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    }
  })

  const extendLoanMutation = useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: number; dueDate: Date }) => {
      return await window.api.loans.extendLoan(loanId, dueDate)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
    // Extend by 14 days from current due date or today
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

  const columns: ColumnDef<LoanWithDetails>[] = [
    {
      accessorKey: 'borrower',
      header: 'Name',
      cell: ({ row }) => {
        const borrower = row.original.borrower
        return (
          <div className="flex flex-col">
            <span>{borrower.name || 'Unknown User'}</span>
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
            <span className="font-medium line-clamp-1" title={book.title}>
              {book.title}
            </span>
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
        )
      }
    }
  ]

  const globalFilterFn = (loan: LoanWithDetails, filterValue: string): boolean => {
    const searchLower = filterValue.toLowerCase()
    const matchesUser =
      loan.borrower.name?.toLowerCase().includes(searchLower) ||
      loan.borrower.email?.toLowerCase().includes(searchLower)
    const matchesBook = loan.book.title.toLowerCase().includes(searchLower)
    return matchesUser || matchesBook
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
      <PageTitle title="Upcoming returns" />

      <DataTable
        columns={columns}
        data={(data?.loans as LoanWithDetails[]) || []}
        pageSize={25}
        searchPlaceholder="Search by name, book or email"
        globalFilterFn={globalFilterFn}
      />
    </div>
  )
}
