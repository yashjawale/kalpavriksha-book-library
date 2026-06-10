import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ArrowLeft, BookOpen, CheckCircle, Pencil, Save, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { addWeeks, format } from 'date-fns'

export const Route = createFileRoute('/users/$email')({
  component: UserDetailsPage
})

type Loan = {
  id: number
  bookIsbn: string
  borrowedAt: string
  returnedAt: string | null
  dueDate: string | null
  book?: { title: string }
}

type User = {
  name: string | null
  email: string
  loans: Loan[]
}

function UserDetailsPage() {
  const { email } = Route.useParams()
  const [user, setUser] = useState<User | null>(null)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)
  const [loanToExtend, setLoanToExtend] = useState<Loan | null>(null)
  const [newDueDate, setNewDueDate] = useState<string>('')

  const loadUser = async () => {
    const data = await window.api.users.getByEmail(email)
    setUser(data as User)
  }

  useEffect(() => {
    let mounted = true
    window.api.users.getByEmail(email).then((data) => {
      if (mounted) setUser(data as User)
    })
    return () => {
      mounted = false
    }
  }, [email])

  const handleReturn = async (loanId: number) => {
    await window.api.loans.returnBook(loanId)
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
    const baseDate = loan.dueDate ? new Date(loan.dueDate) : new Date()
    setNewDueDate(format(addWeeks(baseDate, 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }

  const handleExtendLoan = async () => {
    if (!loanToExtend || !newDueDate) return
    try {
      await window.api.loans.extendLoan(loanToExtend.id, new Date(newDueDate))
      setExtensionDialogOpen(false)
      setLoanToExtend(null)
      loadUser()
    } catch (err) {
      console.error(err)
    }
  }

  if (!user) return <div className="p-4">Loading user details...</div>

  const currentLoans = user.loans.filter((l: Loan) => !l.returnedAt)
  const pastLoans = user.loans.filter((l: Loan) => l.returnedAt)

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/users">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            {!isEditingName ? (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{user.name || 'Unknown User'}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditingName(true)
                    setEditNameValue(user.name || '')
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  className="text-xl font-bold h-10 w-64"
                />
                <Button onClick={handleUpdateName} size="sm">
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
                <Button onClick={() => setIsEditingName(false)} size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            )}
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Link to="/rentals">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> New Rental
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" /> Current Rentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentLoans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Borrowed At</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLoans.map((loan: Loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      {loan.book?.title || 'Unknown Book'}
                    </TableCell>
                    <TableCell>{loan.bookIsbn}</TableCell>
                    <TableCell>{new Date(loan.borrowedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'Not Set'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenExtendDialog(loan)}
                      >
                        Extend Due Date
                      </Button>
                      <Button size="sm" onClick={() => handleReturn(loan.id)}>
                        Mark Returned
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4">No active rentals.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> Past Rentals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastLoans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>ISBN</TableHead>
                  <TableHead>Borrowed At</TableHead>
                  <TableHead>Returned At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastLoans.map((loan: Loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">
                      {loan.book?.title || 'Unknown Book'}
                    </TableCell>
                    <TableCell>{loan.bookIsbn}</TableCell>
                    <TableCell>{new Date(loan.borrowedAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(loan.returnedAt!).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4">No past rentals.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Loan Due Date</DialogTitle>
            <DialogDescription>
              Set a new due date for {loanToExtend?.book?.title || 'this book'}
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
    </div>
  )
}
