import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { X, Info } from 'lucide-react'
import { LoginOverlay } from '@renderer/components/LoginOverlay'
import { Combobox } from '@renderer/components/ui/combobox'
import { useDebouncedCallback } from '@renderer/hooks/use-debounced-callback'
import { addWeeks, addMonths, format } from 'date-fns'
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
import PageTitle from '@renderer/components/ui/page-title'

export const Route = createFileRoute('/rentals/new')({
  component: NewRentalPage
})

function NewRentalPage() {
  const navigate = useNavigate()
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })

  // Form states (New Rental)
  const [email, setEmail] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ name: string; email: string }[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [dueDate, setDueDate] = useState<string>(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))

  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([])
  const [searchingBooks, setSearchingBooks] = useState(false)
  type SelectedBook = { book: Book; quantity: number }
  const [selectedBooks, setSelectedBooks] = useState<SelectedBook[]>([])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.auth.getStatus().then(setAuthStatus)
  }, [])

  const fetchAndAddBookByIsbn = useCallback(
    async (isbn: string) => {
      try {
        const book = await window.api.books.getById(isbn)
        if (book) {
          const openStock = book.totalStock - (book.loans?.length || 0)
          const existing = selectedBooks.find((b) => b.book.isbn === book.isbn)
          const currentQty = existing ? existing.quantity : 0

          if (openStock - currentQty <= 0) {
            toast.error(`Book "${book.title || isbn}" is out of stock.`)
            return
          }

          if (existing) {
            setSelectedBooks((prev) =>
              prev.map((b) => (b.book.isbn === book.isbn ? { ...b, quantity: b.quantity + 1 } : b))
            )
          } else {
            setSelectedBooks((prev) => [...prev, { book, quantity: 1 }])
          }
          toast.success(`Added ${book.title}`)
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
        }, 500)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(barcodeTimeout)
    }
  }, [selectedBooks, fetchAndAddBookByIsbn])

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
      const result = await window.api.books.getAll(1, 5, 'title', 'asc', query)
      setBookSearchResults(result.books)
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

      const bookIsbns: string[] = []
      selectedBooks.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
          bookIsbns.push(item.book.isbn)
        }
      })

      await window.api.loans.create({
        bookIsbns,
        userEmail: email,
        userName: selectedUser?.name || fallbackName,
        dueDate: dueDate ? new Date(dueDate) : null
      })

      toast.success(`Successfully rented ${bookIsbns.length} book(s)`)

      // Navigate back on success
      setTimeout(() => {
        navigate({ to: '/rentals' })
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

  if (!authStatus.loggedIn) {
    return <LoginOverlay description="You must be logged in to issue books." />
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
            <TagBadge key={tag.tag.id} tag={tag.tag} />
          ))}
          {(b.bookTags?.length || 0) > 3 && (
            <span className="text-[10px] text-muted-foreground">+{b.bookTags!.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <PageTitle title="New Issue" />
          <p className="text-muted-foreground">Issue books to a library member.</p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/rentals">Cancel</Link>
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
                    const existing = selectedBooks.find((b) => b.book.isbn === selected.isbn)
                    const currentQty = existing ? existing.quantity : 0

                    if (openStock - currentQty <= 0) {
                      toast.error(`Book is out of stock.`)
                      return
                    }

                    if (existing) {
                      setSelectedBooks((prev) =>
                        prev.map((b) =>
                          b.book.isbn === selected.isbn ? { ...b, quantity: b.quantity + 1 } : b
                        )
                      )
                    } else {
                      setSelectedBooks((prev) => [...prev, { book: selected, quantity: 1 }])
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
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-12.5"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBooks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          No books added yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedBooks.map((item) => (
                        <TableRow key={item.book.isbn}>
                          <TableCell className="font-medium">{item.book.title}</TableCell>
                          <TableCell className="text-muted-foreground">{item.book.isbn}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setSelectedBooks((prev) =>
                                      prev.map((b) =>
                                        b.book.isbn === item.book.isbn
                                          ? { ...b, quantity: b.quantity - 1 }
                                          : b
                                      )
                                    )
                                  } else {
                                    setSelectedBooks((prev) =>
                                      prev.filter((b) => b.book.isbn !== item.book.isbn)
                                    )
                                  }
                                }}
                              >
                                -
                              </Button>
                              <span className="text-sm w-4 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const openStock =
                                    item.book.totalStock - (item.book.loans?.length || 0)
                                  if (openStock - item.quantity > 0) {
                                    setSelectedBooks((prev) =>
                                      prev.map((b) =>
                                        b.book.isbn === item.book.isbn
                                          ? { ...b, quantity: b.quantity + 1 }
                                          : b
                                      )
                                    )
                                  } else {
                                    toast.error('Not enough stock')
                                  }
                                }}
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {item.book.bookTags?.map((tag) => (
                                <TagBadge key={tag.tag.id} tag={tag.tag} className="text-[10px]" />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setSelectedBooks((prev) =>
                                  prev.filter((b) => b.book.isbn !== item.book.isbn)
                                )
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
                onChange={(val) => {
                  setEmail(val)
                  window.api.auth
                    .getUserDetails(val)
                    .then((details) => {
                      if (details?.orgUnitPath?.includes('Teachers')) {
                        setDueDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
                        toast.success('Return date set to 1 month for Teacher')
                      } else {
                        setDueDate(format(addWeeks(new Date(), 1), 'yyyy-MM-dd'))
                      }
                    })
                    .catch(console.error)
                }}
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
