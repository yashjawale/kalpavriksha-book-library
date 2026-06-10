import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@renderer/components/ui/alert'
import { Lock, ArrowRightLeft, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/rentals')({
  component: RentalsPage
})

function RentalsPage() {
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })
  const [email, setEmail] = useState('')
  const [isbn, setIsbn] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const isbnInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
  }, [])

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (!email.endsWith('@kalpavrikshaacademy.com')) {
        throw new Error('Email must end with @kalpavrikshaacademy.com')
      }

      await window.api.loans.create({
        bookIsbn: isbn,
        userEmail: email,
        dueDate: dueDate ? new Date(dueDate) : null
      })

      setSuccess(`Successfully rented book ${isbn} to ${email}`)
      setIsbn('')

      if (isbnInputRef.current) {
        isbnInputRef.current.focus()
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An error occurred while creating rental')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!authStatus.loggedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold tracking-tight">Authentication Required</h2>
        <p className="text-muted-foreground">You must be logged in to create rentals.</p>
        <Button onClick={() => window.api.auth.login().then(() => window.location.reload())}>
          Login with Google
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 mt-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ArrowRightLeft className="w-8 h-8" /> New Rental
        </h1>
        <p className="text-muted-foreground">Rent a book to a student using their email address.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rental Details</CardTitle>
          <CardDescription>Scan a barcode or enter the details manually.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRental} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Student Email (@kalpavrikshaacademy.com)</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@kalpavrikshaacademy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isbn">Book ISBN</Label>
              <div className="flex gap-2">
                <Input
                  id="isbn"
                  ref={isbnInputRef}
                  placeholder="Scan or type ISBN..."
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Expected Return Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rental'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
