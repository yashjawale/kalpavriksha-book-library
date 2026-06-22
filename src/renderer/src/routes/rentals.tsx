import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Lock, ArrowRightLeft, X, Search, Info } from 'lucide-react'
import { Combobox } from '@renderer/components/ui/combobox'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { addWeeks, format } from 'date-fns'
import type { Book } from '@renderer/types/book'
import { TagBadge } from '@renderer/components/TagBadge'
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
  const [activeLoans, setActiveLoans] = useState<
    {
      id: number
      book: Book
      borrower: { name: string | null; email: string }
      dueDate: Date | null
      borrowedAt: Date
    }[]
  >([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Filtering for All Rentals
  const [searchQuery, setSearchQuery] = useState('')

  // Form states (New Rental)
  const [email, setEmail] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ name: string; email: string }[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [dueDate, setDueDate] = useState<string>(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))

  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([])
  const [searchingBooks, setSearchingBooks] = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<Book[]>([])

  const [loading, setLoading] = useState(false)

  // Return Confirmation Dialog
  const [returnLoanId, setReturnLoanId] = useState<number | null>(null)

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
    loadActiveLoans()
  }, [])

  const fetchAndAddBookByIsbn = useCallback(
    async (isbn: string) => {
      try {
        const book = await window.api.books.getById(isbn)
        if (book) {
          const openStock = book.totalStock - (book.loans?.length || 0)
          if (openStock <= 0) {
            toast.error(`Book "${book.title || isbn}" is out of stock.`)
            return
          }
          if (!selectedBooks.find((b) => b.isbn === book.isbn)) {
            setSelectedBooks((prev) => [...prev, book])
            toast.success(`Added ${book.title}`)
          } else {
            toast.info(`Book already in list.`)
          }
        } else {
          toast.error(`Book with ISBN ${isbn} not found.`)
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to fetch book.')
      }
    },
    [selectedBooks]
  )

  // Barcode scanner listener for New Rental screen
  useEffect(() => {
    let barcodeBuffer = ''
    let barcodeTimeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process when New Rental screen is open
      if (!showForm) return

      const target = e.target as HTMLElement
      // Ignore if user is typing in an input
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
        barcodeBuffer += e.key
        clearTimeout(barcodeTimeout)
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = ''
        }, 50)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(barcodeTimeout)
    }
  }, [showForm, selectedBooks, fetchAndAddBookByIsbn])

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

  const debouncedBookSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setBookSearchResults([])
      return
    }

    setSearchingBooks(true)
    try {
      // Fetch up to 5 books matching the search query (title or isbn)
      const results = await window.api.books.getAll(1, 5, 'title', 'asc', query)
      setBookSearchResults(results)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingBooks(false)
    }
  }, 500)

  const handleCreateRental = async () => {
    setLoading(true)

    try {
      if (!email) {
        throw new Error('Please select or enter an email address')
      }
      if (!email.endsWith('@kalpavrikshaacademy.com')) {
        throw new Error('Email must end with @kalpavrikshaacademy.com')
      }

      if (selectedBooks.length === 0) {
        throw new Error('Select at least one book')
      }

      const selectedUser = userSearchResults.find((u) => u.email === email)
      const fallbackName = email
        .split('@')[0]
        .replace(/\./g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())

      await window.api.loans.create({
        bookIsbns: selectedBooks.map((b) => b.isbn),
        userEmail: email,
        userName: selectedUser?.name || fallbackName,
        dueDate: dueDate ? new Date(dueDate) : null
      })

      toast.success(`Successfully rented ${selectedBooks.length} book(s)`)

      // Reset form on success
      setTimeout(() => {
        setShowForm(false)
        setEmail('')
        setSelectedBooks([])
        loadActiveLoans()
      }, 1000)
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error('An error occurred while creating rental')
      }
    } finally {
      setLoading(false)
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

  // Filter loans for All Rentals
  const filteredLoans = activeLoans.filter((loan) => {
    const s = searchQuery.toLowerCase()
    const bookTitle = (loan.book?.title || loan.bookIsbn).toLowerCase()
    const userName = (loan.borrower?.name || '').toLowerCase()
    const userEmail = (loan.userEmail || '').toLowerCase()
    return bookTitle.includes(s) || userName.includes(s) || userEmail.includes(s)
  })

  if (!showForm) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-8 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ArrowRightLeft className="w-8 h-8" /> All Rentals
            </h1>
            <p className="text-muted-foreground">Manage active book rentals.</p>
          </div>
          <Button onClick={() => setShowForm(true)}>New Rental</Button>
        </div>

        <Card>
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
                              <span className="text-xs text-muted-foreground">
                                {loan.userEmail}
                              </span>
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

  // Render Combobox custom option
  const renderBookOption = (b: Book) => {
    const openStock = b.totalStock - (b.loans?.length || 0)
    const outOfStock = openStock <= 0

    return (
      <div className={`flex flex-col gap-1 w-full ${outOfStock ? 'opacity-50' : ''}`}>
        <div className="flex justify-between items-start">
          <span className="font-semibold truncate pr-2">{b.title}</span>
          <span className="text-xs whitespace-nowrap pt-1">
            Stock: {openStock}/{b.totalStock}
          </span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-2 truncate">
          {b.author && <span>{b.author}</span>}
          {b.publisher && <span>• {b.publisher}</span>}
          <span>• ISBN: {b.isbn}</span>
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {b.bookTags?.slice(0, 3).map((tag) => (
            <span key={tag.tag.id} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">
              {tag.tag.name}
            </span>
          ))}
          {(b.bookTags?.length || 0) > 3 && (
            <span className="text-[10px] text-muted-foreground">+{b.bookTags!.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 mt-8 p-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Books */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Books</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label>Add book</Label>
              <Combobox
                options={bookSearchResults.map((b) => {
                  const openStock = b.totalStock - (b.loans?.length || 0)
                  return {
                    label: b.title,
                    value: b.isbn,
                    disabled: openStock <= 0,
                    customNode: renderBookOption(b)
                  }
                })}
                onChange={(val) => {
                  const selected = bookSearchResults.find((b) => b.isbn === val)
                  if (selected) {
                    const openStock = selected.totalStock - (selected.loans?.length || 0)
                    if (openStock <= 0) {
                      toast.error(`Book is out of stock.`)
                      return
                    }
                    if (!selectedBooks.find((b) => b.isbn === selected.isbn)) {
                      setSelectedBooks((prev) => [...prev, selected])
                    }
                  }
                }}
                onInputChange={(val) => {
                  debouncedBookSearch('book-search', val)
                }}
                placeholder="Search by ISBN or Title..."
                searchPlaceholder="Type to search..."
                loading={searchingBooks}
                emptyText="No books found."
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Info className="w-3 h-3" />
                Barcode scanner can be used directly without focusing the input.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Added books</Label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Code (ISBN)</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBooks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          No books added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedBooks.map((book) => (
                        <TableRow key={book.isbn}>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell className="text-muted-foreground">{book.isbn}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {book.bookTags?.map((tag) => (
                                <TagBadge key={tag.tag.id} tag={tag.tag} className="text-[10px]" />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setSelectedBooks((prev) => prev.filter((b) => b.isbn !== book.isbn))
                              }
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Rental Details */}
        <Card>
          <CardHeader>
            <CardTitle>Rental details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
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
                placeholder="Student Email..."
                searchPlaceholder="Search name or email..."
                loading={searchingUsers}
                emptyText="No user found."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Expected return</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleCreateRental}
              disabled={loading || selectedBooks.length === 0 || !email}
            >
              {loading ? 'Processing...' : 'Lend books'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
