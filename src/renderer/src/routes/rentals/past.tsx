import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Input } from '@renderer/components/ui/input'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { useSimpleDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { Search } from 'lucide-react'
import PageTitle from '@renderer/components/ui/page-title'
import { format } from 'date-fns'
import { PaginationBar } from '@renderer/components/ui/pagination-bar'

export const Route = createFileRoute('/rentals/past')({
  component: PastRentalsPage
})

type PastLoan = {
  id: number
  bookIsbn: string
  borrowedAt: Date
  returnedAt: Date | null
  userEmail: string
  borrower?: { name: string | null }
  book?: { title: string }
}

function PastRentalsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const { data, isLoading } = useQuery({
    queryKey: ['loans', 'past', page, searchQuery],
    queryFn: async () => {
      const result = await window.api.loans.getPastLoans(page, perPage, searchQuery)
      return result as { loans: PastLoan[]; total: number }
    }
  })

  const loans = data?.loans ?? []
  const totalLoans = data?.total ?? 0
  const totalPages = Math.ceil(totalLoans / perPage)

  const debouncedSearch = useSimpleDebouncedCallback((val: string) => {
    setSearchQuery(val)
    setPage(1)
  }, 500)

  return (
    <div className="w-full">
      <PageTitle title="Past Loans" />
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-muted-foreground">View history of returned books.</p>
        </div>
      </div>

      <div className="relative w-full sm:w-80 pb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by book, name or email..."
          className="pl-8"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            debouncedSearch(e.target.value)
          }}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Borrowed on</TableHead>
              <TableHead>Returned on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: perPage }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-2/3" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : loans.length > 0 ? (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <Link
                        to="/users/$email"
                        params={{ email: loan.userEmail }}
                        className="hover:underline text-primary"
                      >
                        {loan.borrower?.name || 'Unknown'}
                      </Link>
                      <span className="text-xs text-muted-foreground">{loan.userEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/books/$isbn"
                      params={{ isbn: loan.bookIsbn }}
                      className="hover:underline text-primary"
                    >
                      {loan.book?.title || loan.bookIsbn}
                    </Link>
                  </TableCell>
                  <TableCell>{format(new Date(loan.borrowedAt), 'dd/MM/yy')}</TableCell>
                  <TableCell>
                    {loan.returnedAt ? format(new Date(loan.returnedAt), 'dd/MM/yy') : 'N/A'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No past loans found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar
        currentPage={page - 1}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p + 1)}
      />
    </div>
  )
}
