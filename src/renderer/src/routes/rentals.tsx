import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
import { Lock, ArrowRightLeft, CheckCircle2, X } from 'lucide-react'
import { Combobox } from '@renderer/components/ui/combobox'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { addWeeks, format } from 'date-fns'
import type { Book } from '@renderer/types/book'
import { TagBadge } from '@renderer/components/TagBadge'

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

  // Active rentals
  const [activeLoans, setActiveLoans] = useState<any[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form states
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ name: string; email: string }[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [dueDate, setDueDate] = useState<string>(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))

  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([])
  const [searchingBooks, setSearchingBooks] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
    loadActiveLoans()
  }, [])

  // Barcode scanner listener
  useEffect(() => {
    let barcodeBuffer = ''
    let barcodeTimeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // If we're not in step 2 or we are typing in an input, ignore
      if (step !== 2) return

      const target = e.target as HTMLElement
      // Only process when not focused on another input to avoid double input
      // However the user requested "if unfocused, will also use barcode scanner to fetch book from db"
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      // Barcode scanners act like fast keyboards usually ending in 'Enter'
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault()
        const isbn = barcodeBuffer
        barcodeBuffer = ''
        fetchAndAddBookByIsbn(isbn)
        return
      }

      if (e.key.length === 1) {
        // Printable characters
        barcodeBuffer += e.key

        clearTimeout(barcodeTimeout)
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = ''
        }, 50) // Assuming < 50ms between key presses for scanner
      }
    }

    if (showForm && step === 2) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(barcodeTimeout)
    }
  }, [showForm, step])

  const loadActiveLoans = async () => {
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

  const debouncedUserSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUserSearchResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const results = await window.api.auth.searchUsers(query)
      setUserSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingUsers(false)
    }
  }, 300)

  const handleUserSearchInput = (value: string) => {
    debouncedUserSearch('user-search', value)
  }

  const fetchAndAddBookByIsbn = async (isbn: string) => {
    try {
      const book = await window.api.books.getById(isbn)
      if (book) {
        if (!selectedBooks.find((b) => b.isbn === book.isbn)) {
          setSelectedBooks((prev) => [...prev, book])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const debouncedBookSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setBookSearchResults([])
      return
    }
    // Also try fetch by isbn directly if it looks like one
    if (/^\d{10,13}$/.test(query)) {
      try {
        const book = await window.api.books.getById(query)
        if (book) {
          setBookSearchResults([book])
          return
        }
      } catch {}
    }

    setSearchingBooks(true)
    try {
      const results = await window.api.books.getAll(1, 10, 'title', 'asc', query)
      setBookSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingBooks(false)
    }
  }, 300)

  const handleCreateRental = async () => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (!email.endsWith('@kalpavrikshaacademy.com')) {
        throw new Error('Email must end with @kalpavrikshaacademy.com')
      }

      if (selectedBooks.length === 0) {
        throw new Error('Select at least one book')
      }

      await window.api.loans.create({
        bookIsbns: selectedBooks.map((b) => b.isbn),
        userEmail: email,
        dueDate: dueDate ? new Date(dueDate) : null
      })

      setSuccess(`Successfully rented ${selectedBooks.length} book(s)`)

      // Reset form on success
      setTimeout(() => {
        setShowForm(false)
        setStep(1)
        setEmail('')
        setSelectedBooks([])
        loadActiveLoans()
        setSuccess(null)
      }, 2000)
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

  const handleReturnAction = async (loanId: number) => {
    try {
      await window.api.loans.returnBook(loanId)
      loadActiveLoans()
    } catch (err) {
      console.error(err)
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

  if (!showForm) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-8 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8" /> Rentals
            </h1>
            <p className="text-muted-foreground">Manage active book rentals.</p>
          </div>
          <Button onClick={() => setShowForm(true)}>New Rental</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Rentals</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLoans ? (
              <p>Loading...</p>
            ) : activeLoans.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Book</th>
                      <th className="px-6 py-3">Borrower</th>
                      <th className="px-6 py-3">Borrowed At</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLoans.map((loan) => (
                      <tr key={loan.id} className="bg-white border-b">
                        <td className="px-6 py-4 font-medium">
                          {loan.book?.title || loan.bookIsbn}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to="/users/$email"
                            params={{ email: loan.userEmail }}
                            className="text-blue-600 hover:underline"
                          >
                            {loan.user?.name || loan.userEmail}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {new Date(loan.borrowedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : 'Not Set'}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnAction(loan.id)}
                          >
                            Mark Returned
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No active rentals found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 mt-8 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-8 h-8" /> New Rental
          </h1>
          <p className="text-muted-foreground">Rent books to a student.</p>
        </div>
        <Button variant="ghost" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Step {step} of 2 - {step === 1 ? 'Select Student' : 'Select Books'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Find and select the student who will borrow the books.'
              : 'Add books to the rental list.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {step === 1 ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="email">Student (@kalpavrikshaacademy.com)</Label>
                  <Combobox
                    options={[
                      ...(email && !userSearchResults.some((u) => u.email === email)
                        ? [{ label: email, value: email }]
                        : []),
                      ...userSearchResults.map((u) => ({
                        label: `${u.name} (${u.email})`,
                        value: u.email
                      }))
                    ]}
                    value={email}
                    onChange={(val) => setEmail(val)}
                    onInputChange={handleUserSearchInput}
                    placeholder="Search or Select Student..."
                    searchPlaceholder="Search student name or email..."
                    loading={searchingUsers}
                    emptyText="No user found in Google Workspace."
                  />
                  <div className="text-sm text-muted-foreground mt-2">
                    Start typing to search users from Google Workspace directory. You can also
                    manually input an email if custom.
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!email || !email.includes('@kalpavrikshaacademy.com')}
                  >
                    Next Step
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Expected Return Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Add Books</Label>
                  <Combobox
                    options={bookSearchResults.map((b) => ({
                      label: `${b.title} (${b.isbn})`,
                      value: b.isbn
                    }))}
                    onChange={(val) => {
                      const selected = bookSearchResults.find((b) => b.isbn === val)
                      if (selected && !selectedBooks.find((b) => b.isbn === selected.isbn)) {
                        setSelectedBooks((prev) => [...prev, selected])
                      }
                    }}
                    onInputChange={(val) => {
                      debouncedBookSearch('book-search', val)
                    }}
                    placeholder="Search books by title or ISBN..."
                    searchPlaceholder="Type here..."
                    loading={searchingBooks}
                    emptyText="Type to search..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Or scan barcode anytime when this form is open but unfocused.
                  </p>
                </div>

                {selectedBooks.length > 0 && (
                  <div className="rounded border p-4 space-y-4">
                    <h3 className="font-semibold text-sm">Selected Books to Rent</h3>
                    {selectedBooks.map((book) => (
                      <div
                        key={book.isbn}
                        className="flex justify-between items-center gap-2 p-2 bg-slate-50 rounded"
                      >
                        <div>
                          <p className="font-medium text-sm">{book.title}</p>
                          <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {book.bookTags?.map((tag) => (
                              <TagBadge
                                key={tag.tag.id}
                                tag={tag.tag}
                                className="text-[10px] w-fit"
                              />
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSelectedBooks((prev) => prev.filter((b) => b.isbn !== book.isbn))
                          }
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

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

                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateRental}
                    disabled={loading || selectedBooks.length === 0}
                  >
                    {loading ? 'Processing...' : `Confirm Rental (${selectedBooks.length} books)`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
