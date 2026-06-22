import type { ColumnDef } from '@tanstack/react-table'
import type { Book } from '@renderer/types/book'
import { Button } from '@renderer/components/ui/button'
import { ArrowUpDown, MoreVertical, Plus, Tag } from 'lucide-react'
import { TagBadge } from '@renderer/components/TagBadge'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

interface BooksColumnsProps {
  onDelete?: (isbn: string, title: string) => Promise<void>
  isDeleting?: boolean
  onAddStock?: (isbn: string, title: string, currentStock: number) => void
  onChangeTags?: (isbn: string, title: string) => void
  onTitleClick?: (isbn: string) => void
}

export function getBooksColumns({
  onDelete,
  isDeleting,
  onAddStock,
  onChangeTags,
  onTitleClick
}: BooksColumnsProps = {}): ColumnDef<Book>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: 'title',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent -ml-2"
          >
            Title
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const title = row.getValue('title') as string | null
        const isbn = row.original.isbn

        if (onTitleClick) {
          return (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onTitleClick(isbn)
              }}
              className="font-medium truncate max-w-64 block hover:underline hover:text-primary transition-colors cursor-pointer"
            >
              {title || '-'}
            </span>
          )
        }

        return <div className="font-medium truncate max-w-64 block">{title || '-'}</div>
      }
    },
    {
      accessorKey: 'author',
      header: 'Author',
      cell: ({ row }) => {
        const author = row.getValue('author') as string | null
        return (
          <div className="text-sm text-muted-foreground truncate max-w-44">{author || '-'}</div>
        )
      }
    },
    {
      accessorKey: 'publisher',
      header: 'Publisher',
      cell: ({ row }) => {
        const publisher = row.getValue('publisher') as string | null
        return (
          <div className="text-sm text-muted-foreground truncate max-w-44">{publisher || '-'}</div>
        )
      }
    },
    {
      accessorKey: 'bookTags',
      header: 'Tags',
      cell: ({ row }) => {
        const bookTags = row.original.bookTags
        return (
          <div className="flex gap-1">
            {bookTags && bookTags.length > 0 ? (
              bookTags.map((bt) => <TagBadge key={bt.tag.id} tag={bt.tag} />)
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const bookTags = row.original.bookTags
        if (!bookTags || bookTags.length === 0) return false
        const searchLower = value.toLowerCase()
        return bookTags.some((bt) => bt.tag.name.toLowerCase().includes(searchLower))
      }
    },
    {
      accessorKey: 'isbn',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent -ml-4"
          >
            ISBN
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return <div className="font-mono text-sm">{row.getValue('isbn')}</div>
      }
    },
    {
      accessorKey: 'totalStock',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent -ml-2"
          >
            Stock
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return <div>{row.getValue('totalStock')}</div>
      }
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent -ml-4"
          >
            Date Added
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date
        return (
          <div className="text-muted-foreground text-sm">
            {new Date(date).toLocaleDateString('en-IN')}
          </div>
        )
      }
    },
    ...(onDelete || onAddStock || onChangeTags
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onAddStock && (
                      <DropdownMenuItem
                        onClick={() =>
                          onAddStock(row.original.isbn, row.original.title, row.original.totalStock)
                        }
                      >
                        <Plus className="mr-2 size-4" />
                        Add Stock
                      </DropdownMenuItem>
                    )}
                    {onChangeTags && (
                      <DropdownMenuItem
                        onClick={() => onChangeTags(row.original.isbn, row.original.title)}
                      >
                        <Tag className="mr-2 size-4" />
                        Change Tags
                      </DropdownMenuItem>
                    )}
                    {(onAddStock || onChangeTags) && onDelete && <DropdownMenuSeparator />}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(row.original.isbn, row.original.title)}
                        className="text-destructive focus:text-destructive"
                        disabled={isDeleting}
                      >
                        <svg
                          className="mr-2 size-4"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }
          } as ColumnDef<Book>
        ]
      : [])
  ]
}
