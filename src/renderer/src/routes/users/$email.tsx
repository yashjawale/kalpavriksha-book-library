import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { Spinner } from '@renderer/components/ui/spinner'
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
import { addWeeks, format, isToday } from 'date-fns'
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
  }>({ loggedIn: false })

  const { email } = Route.useParams()
  const queryClient = useQueryClient()

  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false)
  const [loanToExtend, setLoanToExtend] = useState<Loan | null>(null)
  const [newDueDate, setNewDueDate] = useState<string>('')

  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [loanToReturn, setLoanToReturn] = useState<number | null>(null)
  const [isBulkExtend, setIsBulkExtend] = useState(false)

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
  }, [])

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', email],
    queryFn: async () => {
      const data = await window.api.users.getByEmail(email)
      return data as unknown as User
    },
    enabled: authStatus.loggedIn
  })

  const { data: orgUnit } = useQuery({
    queryKey: ['user-org', email],
    queryFn: async () => {
      const googleData = await window.api.auth.getUserDetails(email)
      return googleData?.orgUnitPath ?? null
    },
    enabled: authStatus.loggedIn
  })

  const invalidateUser = () => {
    queryClient.invalidateQueries({ queryKey: ['user', email] })
    queryClient.invalidateQueries({ queryKey: ['loans', 'active'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['upcoming-returns'] })
    queryClient.invalidateQueries({ queryKey: ['returns-today'] })
    queryClient.invalidateQueries({ queryKey: ['books'] })
  }

  const returnMutation = useMutation({
    mutationFn: async (loanId: number) => {
      await window.api.loans.returnBook(loanId)
    },
    onSuccess: () => {
      toast.success('Book marked as returned.')
      invalidateUser()
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to return book.')
    }
  })

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      await window.api.users.updateName(email, name)
    },
    onSuccess: () => {
      toast.success('Name updated.')
      invalidateUser()
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to update name.')
    }
  })

  const extendMutation = useMutation({
    mutationFn: async ({ loanId, dueDate }: { loanId: number; dueDate: Date }) => {
      await window.api.loans.extendLoan(loanId, dueDate)
    },
    onSuccess: () => {
      toast.success('Loan extended.')
      invalidateUser()
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to extend loan.')
    }
  })

  const bulkExtendMutation = useMutation({
    mutationFn: async (dueDate: Date) => {
      const activeLoanIds = user?.loans.filter((l) => !l.returnedAt).map((l) => l.id) || []
      if (activeLoanIds.length > 0) {
        await window.api.loans.bulkExtendLoans(activeLoanIds, dueDate)
      }
    },
    onSuccess: () => {
      toast.success('All active loans extended.')
      invalidateUser()
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to extend loans.')
    }
  })

  const bulkReturnMutation = useMutation({
    mutationFn: async () => {
      if (!user) return
      const activeLoanIds = user.loans.filter((l) => !l.returnedAt).map((l) => l.id)
      if (activeLoanIds.length > 0) {
        await window.api.loans.bulkReturnBooks(activeLoanIds)
      }
    },
    onSuccess: () => {
      toast.success('All active loans marked as returned.')
      invalidateUser()
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to return books.')
    }
  })

  const handleReturn = async () => {
    if (loanToReturn === null) return
    await returnMutation.mutateAsync(loanToReturn)
    setReturnDialogOpen(false)
    setLoanToReturn(null)
  }

  const handleUpdateName = async () => {
    await updateNameMutation.mutateAsync(editNameValue)
    setIsEditingName(false)
  }

  const handleOpenExtendDialog = (loan: Loan) => {
    setLoanToExtend(loan)
    setIsBulkExtend(false)
    const baseDate = loan.dueDate ? new Date(loan.dueDate) : new Date()
    setNewDueDate(format(addWeeks(baseDate, 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }

  const handleExtendLoan = async () => {
    if (isBulkExtend) {
      await bulkExtendMutation.mutateAsync(new Date(newDueDate))
    } else {
      if (loanToExtend) {
        await extendMutation.mutateAsync({ loanId: loanToExtend.id, dueDate: new Date(newDueDate) })
      }
    }
    setExtensionDialogOpen(false)
    setLoanToExtend(null)
  }

  const handleBulkReturn = () => {
    if (!user) return
    const count = user.loans.filter((l) => !l.returnedAt).length
    if (count === 0) return
    bulkReturnMutation.mutate()
  }

  const handleBulkExtend = () => {
    setIsBulkExtend(true)
    setNewDueDate(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))
    setExtensionDialogOpen(true)
  }

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to view user details." />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">User not found</h2>
        <Button asChild variant="outline">
          <Link to="/users">Return to Users</Link>
        </Button>
      </div>
    )
  }

  const currentLoans = user.loans.filter((l: Loan) => !l.returnedAt)
  const pastLoans = user.loans.filter((l: Loan) => l.returnedAt)

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
          {orgUnit && orgUnit !== '/' && (
            <p className="text-primary py-1 px-2 rounded-full border border-primary w-fit text-sm">
              {orgUnit.startsWith('/') ? orgUnit.slice(1) : orgUnit}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl font-semibold tracking-tight">Currently Issued</h2>
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
                          disabled={bulkReturnMutation.isPending}
                        >
                          Mark all as returned
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary"
                          onClick={handleBulkExtend}
                          disabled={bulkExtendMutation.isPending}
                        >
                          Extend all
                        </Button>
                      </div>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLoans.map((loan: Loan) => {
                  const dueDateObj = loan.dueDate ? new Date(loan.dueDate) : null
                  const startOfToday = new Date()
                  startOfToday.setHours(0, 0, 0, 0)
                  const isOverdue = dueDateObj && dueDateObj < startOfToday
                  const dueToday = dueDateObj && isToday(dueDateObj)
                  return (
                    <TableRow
                      key={loan.id}
                      className={
                        isOverdue
                          ? 'bg-red-50 hover:bg-red-100/50 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                          : dueToday
                            ? 'bg-yellow-50 hover:bg-yellow-100/50 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30'
                            : ''
                      }
                    >
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
                      <TableCell>
                        {(() => {
                          const tags = loan.book?.bookTags?.map((t) => t.tag) || []
                          if (tags.length === 0)
                            return <span className="text-muted-foreground">-</span>
                          return (
                            <div className="flex flex-wrap gap-1">
                              {tags.map((t) => (
                                <TagBadge tag={t} key={t.id} />
                              ))}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        {loan.dueDate ? format(new Date(loan.dueDate), 'dd/MM/yy') : 'Not Set'}
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
                          disabled={returnMutation.isPending}
                        >
                          Mark as returned
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenExtendDialog(loan)}
                          className="h-8"
                          disabled={extendMutation.isPending}
                        >
                          Extend
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {currentLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No active loans.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight mb-2">Past loans</h2>
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
                    <TableCell>
                      {(() => {
                        const tags = loan.book?.bookTags?.map((t) => t.tag) || []
                        if (tags.length === 0)
                          return <span className="text-muted-foreground">-</span>
                        return (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((t) => (
                              <TagBadge tag={t} key={t.id} />
                            ))}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>{format(new Date(loan.returnedAt!), 'dd/MM/yy')}</TableCell>
                  </TableRow>
                ))}
                {pastLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No past loans.
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
                ? 'Set a new due date for all currently active loans.'
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
            <Button onClick={handleExtendLoan}>
              {extendMutation.isPending || bulkExtendMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
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
            <Button onClick={handleUpdateName} disabled={updateNameMutation.isPending}>
              {updateNameMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
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
            <Button onClick={handleReturn} disabled={returnMutation.isPending}>
              {returnMutation.isPending ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Returning...
                </>
              ) : (
                'Confirm Return'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
