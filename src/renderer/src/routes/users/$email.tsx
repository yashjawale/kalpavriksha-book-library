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
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react'

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

  if (!user) return <div className="p-4">Loading user details...</div>

  const currentLoans = user.loans.filter((l: Loan) => !l.returnedAt)
  const pastLoans = user.loans.filter((l: Loan) => l.returnedAt)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to="/users">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{user.name || 'Unknown'}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
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
                  <TableHead>Action</TableHead>
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
                    <TableCell>
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
    </div>
  )
}
