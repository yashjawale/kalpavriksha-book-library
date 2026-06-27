import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@renderer/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import PageTitle from '@renderer/components/ui/page-title'

export const Route = createFileRoute('/rentals/')({
  component: RentalsPage
})

function RentalsPage() {
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })

  // Active rentals
  const [activeLoans, setActiveLoans] = useState<
    Awaited<ReturnType<typeof window.api.loans.getAllActive>>
  >([])
  const [loadingLoans, setLoadingLoans] = useState(false)

  // Filtering for All Rentals
  const [searchQuery, setSearchQuery] = useState('')

  // Return Confirmation Dialog
  const [returnLoanId, setReturnLoanId] = useState<number | null>(null)

  useEffect(() => {
    window.api.auth.getStatus().then((status) => {
      setAuthStatus(status)
      if (status.loggedIn) {
        loadActiveLoans()
      }
    })
  }, [])

  async function loadActiveLoans() {
    setLoadingLoans(true)
    try {
      const data = await window.api.loans.getAllActive()
      setActiveLoans(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLoans(false)
    }
  }

  const handleReturnAction = async () => {
    if (!returnLoanId) return
    try {
      await window.api.loans.returnBook(returnLoanId)
      toast.success('Book marked as returned.')
      loadActiveLoans()
    } catch (err) {
      console.error(err)
      toast.error('Failed to return book.')
    } finally {
      setReturnLoanId(null)
    }
  }

  // Filter loans for All Rentals
  const filteredLoans = activeLoans.filter((loan) => {
    const s = searchQuery.toLowerCase()
    const bookTitle = (loan.book?.title || loan.bookIsbn).toLowerCase()
    const userName = (loan.borrower?.name || '').toLowerCase()
    const userEmail = (loan.userEmail || '').toLowerCase()
    return bookTitle.includes(s) || userName.includes(s) || userEmail.includes(s)
  })

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view rentals." />
  }

  return (
    <div className="w-full">
      <PageTitle title="Book Rentals" />
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">Manage active book rentals.</p>
        </div>
        <Button asChild>
          <Link to="/rentals/new">New Rental</Link>
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle>Active Rentals</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by book, name or email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLoans ? (
            <p>Loading...</p>
          ) : filteredLoans.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Return date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => {
                    const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date()
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{loan.borrower?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{loan.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>{loan.book?.title || loan.bookIsbn}</TableCell>
                        <TableCell>
                          {isOverdue ? (
                            <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded">
                              Overdue
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">
                              Active
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'Not Set'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to="/users/$email" params={{ email: loan.userEmail }}>
                              <Button size="sm" variant="outline">
                                View details
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReturnLoanId(loan.id)}
                            >
                              Mark Returned
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No active rentals found.</p>
          )}
        </CardContent>
      </Card>

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
