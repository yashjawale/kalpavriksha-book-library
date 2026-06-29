import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { useSimpleDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import PageTitle from '@renderer/components/ui/page-title'

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
  const [loans, setLoans] = useState<PastLoan[]>([])
  const [totalLoans, setTotalLoans] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10
  const [loading, setLoading] = useState(false)

  const fetchLoans = async (p: number, q: string) => {
    setLoading(true)
    try {
      const data = (await window.api.loans.getPastLoans(p, perPage, q)) as {
        loans: PastLoan[]
        total: number
      }
      setLoans(data.loans)
      setTotalLoans(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useSimpleDebouncedCallback((val: string) => {
    setPage(1)
    fetchLoans(1, val)
  }, 500)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const data = (await window.api.loans.getPastLoans(page, perPage, searchQuery)) as {
          loans: PastLoan[]
          total: number
        }
        if (mounted) {
          setLoans(data.loans)
          setTotalLoans(data.total)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.ceil(totalLoans / perPage)

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
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
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
            {loading && loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : loans.length > 0 ? (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{loan.borrower?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{loan.userEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell>{loan.book?.title || loan.bookIsbn}</TableCell>
                  <TableCell>{new Date(loan.borrowedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString() : 'N/A'}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
