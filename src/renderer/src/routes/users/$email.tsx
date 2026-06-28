import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ArrowLeft, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { addWeeks, format } from 'date-fns'
import PageTitle from '@renderer/components/ui/page-title'
import { TagBadge } from '@renderer/components/TagBadge'

export const Route = createFileRoute('/users/$email')({
  component: UserDetailsPage
})

type Tag = { id: number; name: string }
type Loan = {
  id: number
  bookIsbn: string
  borrowedAt: string
  returnedAt: string | null
  dueDate: string | null
  book?: {
    title: string
    bookTags?: { tag: Tag }[]
  }
}

type User = {
  name: string | null
  email: string
  loans: Loan[]
}

function UserDetailsPage() {
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })

  const { email } = Route.useParams()
  const [user, setUser] = useState<User | null>(null)
  const [orgUnit, setOrgUnit] = useState<string | null>(null)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)
  const [loanToExtend, setLoanToExtend] = useState<Loan | null>(null)
  const [newDueDate, setNewDueDate] = useState<string>('')

  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [loanToReturn, setLoanToReturn] = useState<number | null>(null)

  // For bulk extend
  const [isBulkExtend, setIsBulkExtend] = useState(false)

  const loadUser = async () => {
    const data = await window.api.users.getByEmail(email)
    setUser(data as unknown as User)
  }

  useEffect(() => {
    let mounted = true
    window.api.auth.getStatus().then((status) => {
      if (mounted) {
        setAuthStatus(status)
        if (status.loggedIn) {
          window.api.users.getByEmail(email).then((data) => {
            if (mounted) setUser(data as unknown as User)
          })
          window.api.auth.getUserDetails(email).then((googleData) => {
            if (mounted && googleData) setOrgUnit(googleData.orgUnitPath)
          })
        }
      }
    })
    return () => {
      mounted = false
    }
  }, [email])

  const handleReturn = async () => {
    if (loanToReturn === null) return
    await window.api.loans.returnBook(loanToReturn)
    setReturnDialogOpen(false)
    setLoanToReturn(null)
    loadUser()
  }

  const handleUpdateName = async () => {
    try {
      await window.api.users.updateName(email, editNameValue)
      setIsEditingName(false)
      loadUser()
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenExtendDialog = (loan: Loan) => {
    setLoanToExtend(loan)
    setIsBulkExtend(false)
    const baseDate = loan.dueDate ? new Date(loan.dueDate) : new Date()
    setNewDueDate(format(addWeeks(baseDate, 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }

  const handleExtendLoan = async () => {
    try {
      if (isBulkExtend) {
        const activeLoanIds = user?.loans.filter((l) => !l.returnedAt).map((l) => l.id) || []
        if (activeLoanIds.length > 0 && newDueDate) {
          await window.api.loans.bulkExtendLoans(activeLoanIds, new Date(newDueDate))
        }
      } else {
        if (loanToExtend && newDueDate) {
          await window.api.loans.extendLoan(loanToExtend.id, new Date(newDueDate))
        }
      }
      setExtensionDialogOpen(false)
      setLoanToExtend(null)
      loadUser()
    } catch (err) {
      console.error(err)
    }
  }

  const handleBulkReturn = async () => {
    if (!user) return
    const activeLoanIds = user.loans.filter((l) => !l.returnedAt).map((l) => l.id)
    if (activeLoanIds.length === 0) return
    if (confirm(`Are you sure you want to mark all ${activeLoanIds.length} rentals as returned?`)) {
      await window.api.loans.bulkReturnBooks(activeLoanIds)
      loadUser()
    }
  }

  const handleBulkExtend = () => {
    setIsBulkExtend(true)
    setNewDueDate(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view user details." />
  }

  if (!user) return <div className="p-4">Loading user details...</div>

  const currentLoans = user.loans.filter((l: Loan) => !l.returnedAt)
  const pastLoans = user.loans.filter((l: Loan) => l.returnedAt)

  const renderTags = (loan: Loan) => {
    const tags = loan.book?.bookTags?.map((t) => t.tag) || []
    if (tags.length === 0) return <span className="text-muted-foreground">-</span>
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <TagBadge tag={t} key={t.id} />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 my-8">
        <Link to="/users" className="w-fit text-primary flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> All Users
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <PageTitle title={user.name || 'Unknown User'} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditNameValue(user.name || '')
                setIsEditingName(true)
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          {orgUnit && (
            <p className="text-primary py-1 px-2 rounded-full border border-primary w-fit text-sm">
              {orgUnit.startsWith('/') ? orgUnit.slice(1) : orgUnit}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl font-semibold tracking-tight">Current rentals</h2>
        </div>
        <Card className="rounded-xl border-border bg-card p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%]">Title</TableHead>
                  <TableHead className="w-[20%]">Code</TableHead>
                  <TableHead className="w-[20%]">Tags</TableHead>
                  <TableHead>Expected return</TableHead>
                  <TableHead className="text-right">
                    {currentLoans.length > 0 && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          onClick={handleBulkReturn}
                        >
                          Mark all as returned
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          onClick={handleBulkExtend}
                        >
                          Extend all
                        </Button>
                      </div>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLoans.map((loan: Loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/books/$isbn"
                        params={{ isbn: loan.bookIsbn }}
                        className="hover:underline"
                      >
                        {loan.book?.title || 'Unknown Book'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {loan.bookIsbn}
                    </TableCell>
                    <TableCell>{renderTags(loan)}</TableCell>
                    <TableCell>
                      {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'Not Set'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setLoanToReturn(loan.id)
                          setReturnDialogOpen(true)
                        }}
                        className="h-8"
                      >
                        Mark as returned
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenExtendDialog(loan)}
                        className="h-8"
                      >
                        Extend
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {currentLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No active rentals.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight mb-2">Past rentals</h2>
        <Card className="rounded-xl border-border bg-card p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[30%]">Title</TableHead>
                  <TableHead className="w-[20%]">Code</TableHead>
                  <TableHead className="w-[20%]">Tags</TableHead>
                  <TableHead>Returned on</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastLoans.map((loan: Loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/books/$isbn"
                        params={{ isbn: loan.bookIsbn }}
                        className="hover:underline"
                      >
                        {loan.book?.title || 'Unknown Book'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {loan.bookIsbn}
                    </TableCell>
                    <TableCell>{renderTags(loan)}</TableCell>
                    <TableCell>{new Date(loan.returnedAt!).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {pastLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No past rentals.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Extend Dialog */}
      <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isBulkExtend ? 'Extend All Active Loans' : 'Extend Loan Due Date'}
            </DialogTitle>
            <DialogDescription>
              {isBulkExtend
                ? 'Set a new due date for all currently active rentals.'
                : `Set a new due date for ${loanToExtend?.book?.title || 'this book'}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtensionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExtendLoan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Name</DialogTitle>
            <DialogDescription>Change the display name for {user.email}.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              placeholder="Enter new name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingName(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateName}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={(open) => !open && setReturnDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark book as returned?</DialogTitle>
            <DialogDescription>
              This will close the active rental and return the book to the available stock.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReturn}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
