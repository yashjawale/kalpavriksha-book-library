import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import PageTitle from '@renderer/components/ui/page-title'
import { DataTable } from '@renderer/components/ui/data-table'
import { useState, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { DiscardedBook, Tag } from '@renderer/types/book'
import { format } from 'date-fns'
import { Button } from '@renderer/components/ui/button'
import { Filter } from 'lucide-react'
import { TagBadge } from '@renderer/components/TagBadge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

export const Route = createFileRoute('/discarded')({
  component: DiscardedBooks
})

function DiscardedBooks() {
  const navigate = useNavigate()
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedTagFilters, setSelectedTagFilters] = useState<number[]>([])
  const pageSize = 25

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll(),
    staleTime: 30_000
  })

  const { data, isLoading } = useQuery({
    queryKey: ['discarded-books', pageIndex, selectedTagFilters],
    queryFn: async () => {
      const result = await window.api.books.getDiscardedBooks(
        pageIndex + 1,
        pageSize,
        selectedTagFilters.length > 0 ? selectedTagFilters : undefined
      )
      return result as { discarded: DiscardedBook[]; total: number }
    },
    staleTime: 30_000
  })

  const discarded = useMemo(() => data?.discarded ?? [], [data?.discarded])
  const total = data?.total ?? 0

  const handleToggleTagFilter = (tagId: number): void => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
    setPageIndex(0)
  }

  const columns: ColumnDef<DiscardedBook>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => {
          const isbn = row.original.isbn
          return (
            <span
              onClick={() => navigate({ to: '/books/$isbn', params: { isbn } })}
              className="font-medium truncate max-w-64 hover:underline hover:text-primary transition-colors cursor-pointer"
              title={row.getValue('title')}
            >
              {row.getValue('title')}
            </span>
          )
        }
      },
      {
        accessorKey: 'isbn',
        header: 'Code',
        cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('isbn')}</div>
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.original.tags
          return (
            <div className="flex gap-1">
              {tags && tags.length > 0 ? (
                tags.map((t) => <TagBadge key={t.tag.id} tag={t.tag} />)
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          )
        }
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => {
          const note = row.getValue('note') as string | null
          return (
            <div
              className="text-sm text-muted-foreground truncate max-w-48"
              title={note || undefined}
            >
              {note || '-'}
            </div>
          )
        }
      },
      {
        accessorKey: 'discardedAt',
        header: 'Date Discarded',
        cell: ({ row }) => {
          const date = row.getValue('discardedAt') as string
          return (
            <div className="text-sm text-muted-foreground">
              {format(new Date(date), 'dd/MM/yy')}
            </div>
          )
        }
      }
    ],
    [navigate]
  )

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <PageTitle title="Discarded Books" />
        {allTags.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={
                  selectedTagFilters.length > 0
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                    : ''
                }
              >
                <Filter className="size-4 mr-2" />
                Filter by Tags
                {selectedTagFilters.length > 0 && ` (${selectedTagFilters.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTagFilters.includes(tag.id)}
                  onCheckedChange={() => handleToggleTagFilter(tag.id)}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedTagFilters.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setSelectedTagFilters([])}
                  >
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <DataTable
        columns={columns}
        data={discarded}
        pageSize={pageSize}
        manualPagination
        pageIndex={pageIndex}
        onPageChange={setPageIndex}
        pageCount={Math.ceil(total / pageSize)}
        total={total}
        isLoading={isLoading}
      />
    </div>
  )
}
