import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Spinner } from '@renderer/components/ui/spinner'
import PageTitle from '@renderer/components/ui/page-title'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Download,
  RotateCcw,
  Loader2,
  Filter,
  List,
  CheckCheck,
  PlusIcon
} from 'lucide-react'
import type { Book, Tag } from '@renderer/types/book'
import { TagBadge } from '@renderer/components/TagBadge'
import { useBarcodeScanner } from '@renderer/hooks/use-barcode-scanner'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { useNavigate } from '@tanstack/react-router'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from '@renderer/components/ui/context-menu'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontSize: 10
  },
  header: {
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: '2px solid #333333',
    paddingBottom: 15
  },
  headerText: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 10,
    color: '#666666'
  },
  dateText: {
    fontSize: 8,
    color: '#999999',
    marginTop: 2
  },
  table: {
    display: 'flex',
    width: '100%',
    marginTop: 10
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 8,
    fontWeight: 'bold',
    fontSize: 10
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottom: '1px solid #dddddd',
    padding: 8,
    fontSize: 9
  },
  tableRowAlt: {
    backgroundColor: '#f9f9f9'
  },
  colBook: {
    width: '50%'
  },
  colQty: {
    width: '15%',
    textAlign: 'center'
  },
  colRentees: {
    width: '35%'
  },
  bookTitle: {
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 10
  },
  bookSub: {
    color: '#666666',
    fontSize: 8
  }
})

interface ActiveLoan {
  id: number
  bookIsbn: string
  userEmail: string
  dueDate: Date | null
  borrower?: { name: string | null }
}

const ReportPDF = ({
  remaining,
  loans
}: {
  remaining: (Book & { remainingQty: number })[]
  loans: ActiveLoan[]
}) => {
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Stock Check Report</Text>
            <Text style={styles.subtitle}>Missing Books & Active Rentees</Text>
            <Text style={styles.dateText}>Generated on {generatedDate}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBook}>Book</Text>
            <Text style={styles.colQty}>Missing Qty</Text>
            <Text style={styles.colRentees}>Active Rentees</Text>
          </View>
          {remaining.map((book, index) => {
            const bookLoans = loans.filter((l) => l.bookIsbn === book.isbn)
            return (
              <View
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                key={book.isbn}
              >
                <View style={styles.colBook}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookSub}>{book.isbn}</Text>
                  <Text style={styles.bookSub}>
                    {book.author || 'Unknown'} • {book.publisher || 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.colQty}>{book.remainingQty}</Text>
                <View style={styles.colRentees}>
                  {bookLoans.length > 0 ? (
                    bookLoans.map((l) => (
                      <Text key={l.id} style={styles.bookSub}>
                        • {l.borrower?.name || l.userEmail}
                        {l.dueDate ? ` (Due: ${format(new Date(l.dueDate), 'dd/MM/yy')})` : ''}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.bookSub}>No active loans</Text>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </Page>
    </Document>
  )
}

const TagFilterPDF = ({
  books,
  noted,
  title
}: {
  books: Book[]
  noted: Record<string, number>
  title: string
}) => {
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>All books from selected tags</Text>
            <Text style={styles.dateText}>Generated on {generatedDate}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBook}>Book</Text>
            <Text style={styles.colQty}>Noted Qty</Text>
            <Text style={styles.colRentees}>Status</Text>
          </View>
          {books.map((book, index) => {
            const notedQty = noted[book.isbn] || 0
            const status =
              notedQty >= book.totalStock ? 'Complete' : `${notedQty}/${book.totalStock}`
            return (
              <View
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                key={book.isbn}
              >
                <View style={styles.colBook}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookSub}>{book.isbn}</Text>
                  <Text style={styles.bookSub}>
                    {book.author || 'Unknown'} • {book.publisher || 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.colQty}>{status}</Text>
                <View style={styles.colRentees}>
                  <Text style={styles.bookSub}>{notedQty > 0 ? 'Noted' : 'Remaining'}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </Page>
    </Document>
  )
}

export const Route = createFileRoute('/stock-check')({
  component: StockCheckPage
})

function StockCheckPage() {
  const navigate = useNavigate()

  const [noted, setNoted] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('stockCheckNoted')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    localStorage.setItem('stockCheckNoted', JSON.stringify(noted))
  }, [noted])

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books', 'all'],
    queryFn: async () => {
      const result = await window.api.books.getAll(1, Number.MAX_SAFE_INTEGER, 'title', 'asc')
      return result.books
    }
  })

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  const { data: activeLoans = [] } = useQuery({
    queryKey: ['loans', 'active'],
    queryFn: async () => await window.api.loans.getAllActive()
  })

  useBarcodeScanner({
    onScan: (barcode) => {
      const book = books.find((b) => b.isbn === barcode)
      if (!book) {
        toast.error(`Book not found with code: ${barcode}`)
        return
      }
      const currentNoted = noted[barcode] || 0
      if (currentNoted >= book.totalStock) {
        toast.info(`Already noted required qty for ${book.title}`)
        return
      }
      handleAdd(barcode, book.totalStock)
      toast.success(`Noted: ${book.title}`)
    }
  })

  const [notedSearch, setNotedSearch] = useState('')
  const [remainingSearch, setRemainingSearch] = useState('')
  const [notedPage, setNotedPage] = useState(1)
  const [remainingPage, setRemainingPage] = useState(1)

  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [manualSearch, setManualSearch] = useState('')

  const [filterTagIds, setFilterTagIds] = useState<number[]>([])
  const [selectedIsbns, setSelectedIsbns] = useState<Set<string>>(new Set())
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)

  const itemsPerPage = 25

  const tagFilteredBooks = useMemo(() => {
    if (filterTagIds.length === 0) return books
    return books.filter((book) => book.bookTags?.some((bt) => filterTagIds.includes(bt.tag.id)))
  }, [books, filterTagIds])

  const { notedList, remainingList } = useMemo(() => {
    const notedArr: (Book & { notedQty: number })[] = []
    const remainingArr: (Book & { remainingQty: number })[] = []

    tagFilteredBooks.forEach((book) => {
      const notedQty = noted[book.isbn] || 0
      if (notedQty > 0) {
        notedArr.push({ ...book, notedQty })
      }

      const remainingQty = book.totalStock - notedQty
      if (remainingQty > 0) {
        remainingArr.push({ ...book, remainingQty })
      }
    })

    return { notedList: notedArr, remainingList: remainingArr }
  }, [tagFilteredBooks, noted])

  const filteredNoted = useMemo(() => {
    const q = notedSearch.toLowerCase()
    return notedList.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q)
    )
  }, [notedList, notedSearch])

  const filteredRemaining = useMemo(() => {
    const q = remainingSearch.toLowerCase()
    return remainingList.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.publisher || '').toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q)
    )
  }, [remainingList, remainingSearch])

  const filteredManual = useMemo(() => {
    const q = manualSearch.toLowerCase()
    if (!q) return books.slice(0, 10)
    return books
      .filter((b) => b.title.toLowerCase().includes(q) || b.isbn.toLowerCase().includes(q))
      .slice(0, 50)
  }, [books, manualSearch])

  const handleAdd = (isbn: string, maxQty: number) => {
    setNoted((prev) => {
      const current = prev[isbn] || 0
      if (current >= maxQty) return prev
      return { ...prev, [isbn]: current + 1 }
    })
  }

  const handleSubtract = (isbn: string) => {
    setNoted((prev) => {
      const current = prev[isbn] || 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[isbn]
        return next
      }
      return { ...prev, [isbn]: current - 1 }
    })
  }

  const handleRestart = () => {
    if (confirm('Are you sure you want to clear all noted stock? This cannot be undone.')) {
      setNoted({})
      setNotedPage(1)
      setRemainingPage(1)
    }
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      console.log('Generating PDF: Starting document generation...')
      const blob = await pdf(<ReportPDF remaining={remainingList} loans={activeLoans} />).toBlob()
      console.log('Generating PDF: Blob created. Size:', blob.size)
      const url = URL.createObjectURL(blob)
      console.log('Generating PDF: Object URL created.')
      const a = document.createElement('a')
      a.href = url
      a.download = `Stock_Check_Report_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('Generating PDF: Download triggered successfully.')
    } catch (error) {
      console.error('Failed to generate PDF', error)
      toast.error('Failed to generate PDF report')
    } finally {
      setIsDownloading(false)
    }
  }

  const [isDownloadingList, setIsDownloadingList] = useState(false)

  const handleDownloadList = async () => {
    if (filterTagIds.length === 0) {
      toast.error('Please select tags to filter first')
      return
    }
    try {
      setIsDownloadingList(true)
      const tagNames = filterTagIds
        .map((id) => allTags.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      const blob = await pdf(
        <TagFilterPDF books={tagFilteredBooks} noted={noted} title={`Stock List - ${tagNames}`} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Stock_List_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to generate PDF', error)
      toast.error('Failed to generate PDF list')
    } finally {
      setIsDownloadingList(false)
    }
  }

  const paginatedNoted = useMemo(
    () => filteredNoted.slice((notedPage - 1) * itemsPerPage, notedPage * itemsPerPage),
    [filteredNoted, notedPage, itemsPerPage]
  )
  const paginatedRemaining = useMemo(
    () => filteredRemaining.slice((remainingPage - 1) * itemsPerPage, remainingPage * itemsPerPage),
    [filteredRemaining, remainingPage, itemsPerPage]
  )

  const totalNotedPages = Math.ceil(filteredNoted.length / itemsPerPage) || 1
  const totalRemainingPages = Math.ceil(filteredRemaining.length / itemsPerPage) || 1

  const handleRowClick = (index: number, listType: 'noted' | 'remaining') => {
    const list = listType === 'noted' ? paginatedNoted : paginatedRemaining
    setSelectedIsbns((prev) => {
      const next = new Set(prev)
      const book = list[index]
      if (!book) return prev
      if (next.has(book.isbn)) {
        next.delete(book.isbn)
      } else {
        next.add(book.isbn)
      }
      return next
    })
    setLastClickedIndex(index)
  }

  const handleShiftClick = (index: number, listType: 'noted' | 'remaining') => {
    const list = listType === 'noted' ? paginatedNoted : paginatedRemaining
    if (lastClickedIndex === null) {
      handleRowClick(index, listType)
      return
    }
    setSelectedIsbns((prev) => {
      const next = new Set(prev)
      const start = Math.min(lastClickedIndex, index)
      const end = Math.max(lastClickedIndex, index)
      for (let i = start; i <= end; i++) {
        const book = list[i]
        if (book) next.add(book.isbn)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIsbns(new Set())
    setLastClickedIndex(null)
  }

  const handleMarkAsNoted = () => {
    selectedIsbns.forEach((isbn) => {
      const book = books.find((b) => b.isbn === isbn)
      if (book) {
        handleAdd(isbn, book.totalStock)
      }
    })
    clearSelection()
  }

  const handleMarkAsRemaining = () => {
    selectedIsbns.forEach((isbn) => {
      setNoted((prev) => {
        const next = { ...prev }
        delete next[isbn]
        return next
      })
    })
    clearSelection()
  }

  const handleMarkAllAsNoted = () => {
    if (!confirm(`Mark all ${filteredRemaining.length} remaining books as noted?`)) return
    filteredRemaining.forEach((book) => {
      const needed = book.totalStock - (noted[book.isbn] || 0)
      if (needed > 0) {
        setNoted((prev) => ({
          ...prev,
          [book.isbn]: (prev[book.isbn] || 0) + needed
        }))
      }
    })
  }

  const isTagFiltered = filterTagIds.length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground">Loading books for stock check...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden p-6 gap-6">
      <div className="shrink-0">
        <PageTitle title="Stock check" />
        <div className="flex gap-2 mt-2 justify-between">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={isTagFiltered ? 'border-primary text-primary' : ''}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {isTagFiltered ? `Filtered (${filterTagIds.length})` : 'Filter tags'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Filter by tags</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {allTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tags available</p>
                    ) : (
                      allTags.map((tag) => {
                        const isSelected = filterTagIds.includes(tag.id)
                        return (
                          <div
                            key={tag.id}
                            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent cursor-pointer"
                            onClick={() =>
                              setFilterTagIds((prev) =>
                                isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                              )
                            }
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-input'
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-primary-foreground"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <TagBadge tag={tag} className="text-xs" />
                          </div>
                        )
                      })
                    )}
                  </div>
                  {isTagFiltered && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        setFilterTagIds([])
                        setNotedPage(1)
                        setRemainingPage(1)
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {isTagFiltered && (
              <Button onClick={handleDownloadList} disabled={isDownloadingList} variant="secondary">
                {isDownloadingList ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <List className="w-4 h-4 mr-2" />
                )}
                Download list
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart
            </Button>
            <Button variant="outline" onClick={() => setManualAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add manually
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download missing books report
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0">
        {/* Noted Column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 border rounded-lg p-4 bg-card">
          <div className="flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">Noted</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{filteredNoted.length} books</span>
              <Button size="icon" className="h-6 w-6" onClick={() => setManualAddOpen(true)}>
                <PlusIcon />
              </Button>
            </div>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title, publisher, author or code"
              value={notedSearch}
              onChange={(e) => {
                setNotedSearch(e.target.value)
                setNotedPage(1)
              }}
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead className="w-30 text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedNoted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      No books noted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedNoted.map((book, index) => (
                    <ContextMenu key={book.isbn}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          className={`cursor-pointer ${selectedIsbns.has(book.isbn) ? 'bg-accent' : ''}`}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault()
                              handleShiftClick(index, 'noted')
                            } else {
                              handleRowClick(index, 'noted')
                            }
                          }}
                          onContextMenu={() => {
                            if (!selectedIsbns.has(book.isbn)) {
                              setSelectedIsbns(new Set([book.isbn]))
                              setLastClickedIndex(index)
                            }
                          }}
                        >
                          <TableCell className="max-w-50">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="font-medium truncate cursor-pointer w-fit max-w-full hover:underline"
                                    onClick={() =>
                                      navigate({ to: '/books/$isbn', params: { isbn: book.isbn } })
                                    }
                                  >
                                    {book.title}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs wrap-break-word">{book.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="text-xs text-muted-foreground mt-1">{book.isbn}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1 items-center">
                              {[book.author, book.publisher].filter(Boolean).join(' • ')}
                              {[book.author, book.publisher].filter(Boolean).length > 0 &&
                                book.bookTags &&
                                book.bookTags.length > 0 && (
                                  <span className="text-muted-foreground/50">•</span>
                                )}
                              {book.bookTags?.map((t) => (
                                <TagBadge
                                  key={t.tag.id}
                                  tag={t.tag}
                                  className="text-[10px] py-0 px-1.5 h-4"
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSubtract(book.isbn)
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-4 text-center tabular-nums">{book.notedQty}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAdd(book.isbn, book.totalStock)
                                }}
                                disabled={book.notedQty >= book.totalStock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            handleMarkAsRemaining()
                          }}
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Mark as remaining
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={notedPage <= 1}
              onClick={() => setNotedPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {notedPage}/{totalNotedPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={notedPage >= totalNotedPages}
              onClick={() => setNotedPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Remaining Column */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 border rounded-lg p-4 bg-card">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="font-semibold text-lg">Remaining</h2>
            <div className="flex items-center gap-2">
              {isTagFiltered && filteredRemaining.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                  onClick={handleMarkAllAsNoted}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Mark all as noted
                </Button>
              )}
              <span
                className={`text-sm ${isTagFiltered ? 'text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded font-medium' : 'text-muted-foreground'}`}
              >
                {filteredRemaining.length}/{isTagFiltered ? tagFilteredBooks.length : books.length}
              </span>
            </div>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title, publisher, author or code"
              value={remainingSearch}
              onChange={(e) => {
                setRemainingSearch(e.target.value)
                setRemainingPage(1)
              }}
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRemaining.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      No remaining books matching search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRemaining.map((book, index) => (
                    <ContextMenu key={book.isbn}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          className={`cursor-pointer ${selectedIsbns.has(book.isbn) ? 'bg-accent' : ''}`}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault()
                              handleShiftClick(index, 'remaining')
                            } else {
                              handleRowClick(index, 'remaining')
                            }
                          }}
                          onContextMenu={() => {
                            if (!selectedIsbns.has(book.isbn)) {
                              setSelectedIsbns(new Set([book.isbn]))
                              setLastClickedIndex(index)
                            }
                          }}
                        >
                          <TableCell className="max-w-50">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="font-medium truncate cursor-pointer w-fit max-w-full hover:underline"
                                    onClick={() =>
                                      navigate({ to: '/books/$isbn', params: { isbn: book.isbn } })
                                    }
                                  >
                                    {book.title}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs wrap-break-word">{book.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="text-xs text-muted-foreground mt-1">{book.isbn}</div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1 items-center">
                              {[book.author, book.publisher].filter(Boolean).join(' • ')}
                              {[book.author, book.publisher].filter(Boolean).length > 0 &&
                                book.bookTags &&
                                book.bookTags.length > 0 && (
                                  <span className="text-muted-foreground/50">•</span>
                                )}
                              {book.bookTags?.map((t) => (
                                <TagBadge
                                  key={t.tag.id}
                                  tag={t.tag}
                                  className="text-[10px] py-0 px-1.5 h-4"
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {book.remainingQty}
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            handleMarkAsNoted()
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Mark as noted
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={remainingPage <= 1}
              onClick={() => setRemainingPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {remainingPage}/{totalRemainingPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={remainingPage >= totalRemainingPages}
              onClick={() => setRemainingPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={manualAddOpen} onOpenChange={setManualAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add book manually</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            <Input
              placeholder="Search book to add..."
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-75 overflow-auto border rounded-md">
              <Table>
                <TableBody>
                  {filteredManual.map((book) => (
                    <TableRow key={book.isbn}>
                      <TableCell className="max-w-75">
                        <div className="font-medium truncate" title={book.title}>
                          {book.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{book.isbn}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            handleAdd(book.isbn, book.totalStock)
                            setManualAddOpen(false)
                            setManualSearch('')
                          }}
                          disabled={(noted[book.isbn] || 0) >= book.totalStock}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredManual.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                        No books found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
