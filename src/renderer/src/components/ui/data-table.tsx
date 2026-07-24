import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Row
} from '@tanstack/react-table'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Skeleton } from '@renderer/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'

function getPageRange(totalPages: number, currentPage: number): (number | '...')[] {
  const siblingCount = 1
  const totalPagesToShow = siblingCount * 2 + 5

  if (totalPages <= totalPagesToShow) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 0)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1)
  const showLeftEllipsis = leftSiblingIndex > 1
  const showRightEllipsis = rightSiblingIndex < totalPages - 2

  const pages: (number | '...')[] = []
  if (showLeftEllipsis) pages.push(0, '...')
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) pages.push(i)
  if (showRightEllipsis) {
    pages.push('...', totalPages - 1)
  } else if (pages[pages.length - 1] !== totalPages - 1) {
    pages.push(totalPages - 1)
  }

  return pages
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  globalFilterFn?: (row: TData, filterValue: string) => boolean
  initialSorting?: SortingState
  enableRowSelection?: boolean
  onRowSelectionChange?: (selectedRows: Record<string, boolean>) => void
  rowSelection?: Record<string, boolean>
  getRowId?: (row: TData) => string
  rowClassName?: (row: Row<TData>) => string
  manualPagination?: boolean
  pageCount?: number
  total?: number
  pageIndex?: number
  onPageChange?: (pageIndex: number) => void
  onSearchChange?: (value: string) => void
  isLoading?: boolean
  skeletonRowCount?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 25,
  globalFilterFn,
  initialSorting = [],
  enableRowSelection = false,
  onRowSelectionChange,
  rowSelection: externalRowSelection,
  getRowId,
  rowClassName,
  manualPagination = false,
  pageCount: externalPageCount,
  total: externalTotal,
  pageIndex: externalPageIndex,
  onPageChange,
  onSearchChange,
  isLoading = false,
  skeletonRowCount = 10
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [internalRowSelection, setInternalRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const rowSelection = externalRowSelection !== undefined ? externalRowSelection : internalRowSelection

  const handleRowSelectionChange = (updater: any) => {
    const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
    if (onRowSelectionChange) {
      onRowSelectionChange(newSelection)
    } else {
      setInternalRowSelection(newSelection)
    }
  }

  const handlePaginationChange = (updater: any) => {
    if (manualPagination && onPageChange) {
      const current = { pageIndex: externalPageIndex ?? 0, pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPageChange(next.pageIndex)
    }
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    ...(manualPagination ? {} : { getFilteredRowModel: getFilteredRowModel() }),
    ...(manualPagination
      ? { manualPagination: true, pageCount: externalPageCount, onPaginationChange: handlePaginationChange }
      : {}),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: handleRowSelectionChange,
    onGlobalFilterChange: setGlobalFilter,
    enableRowSelection,
    getRowId,
    globalFilterFn: globalFilterFn
      ? (row, _columnId, filterValue) => globalFilterFn(row.original, filterValue)
      : undefined,
    getColumnCanGlobalFilter: globalFilterFn ? () => true : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(manualPagination && externalPageIndex !== undefined
        ? { pagination: { pageIndex: externalPageIndex, pageSize } }
        : {})
    },
    initialState: {
      pagination: {
        pageSize
      }
    }
  })

  let searchValue: string
  if (onSearchChange) {
    searchValue = searchInput
  } else if (globalFilterFn) {
    searchValue = globalFilter
  } else {
    searchValue = (table.getColumn(searchKey!)?.getFilterValue() as string) ?? ''
  }

  return (
    <div className="space-y-4">
      {(searchKey || globalFilterFn || onSearchChange) && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => {
                const value = event.target.value
                if (onSearchChange) {
                  setSearchInput(value)
                  onSearchChange(value)
                } else if (globalFilterFn) {
                  setGlobalFilter(value)
                } else {
                  table.getColumn(searchKey!)?.setFilterValue(value)
                }
              }}
              className="pl-9"
            />
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                <TableRow key={`skeleton-${rowIdx}`}>
                  {table.getVisibleFlatColumns().map((col, colIdx) => {
                    const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-4/5', 'w-3/5', 'w-2/5']
                    return (
                      <TableCell key={col.id}>
                        <Skeleton className={`h-4 ${widths[colIdx % widths.length]}`} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && 'selected'}
                  className={rowClassName ? rowClassName(row) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} title={cell.renderValue()?.toString() ?? ''}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {manualPagination ? (
              <>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  externalTotal ?? 0
                )}{' '}
                of {externalTotal ?? 0} rows
              </>
            ) : (
              <>
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{' '}
                of {table.getFilteredRowModel().rows.length} rows
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {getPageRange(table.getPageCount(), table.getState().pagination.pageIndex).map(
              (page, i) =>
                page === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={page === table.getState().pagination.pageIndex ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => table.setPageIndex(page)}
                    className="min-w-9"
                  >
                    {page + 1}
                  </Button>
                )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
