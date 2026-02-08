import type { ColumnDef } from '@tanstack/react-table'
import type { Book } from '@renderer/types/book'
import { Button } from '@renderer/components/ui/button'
import { ArrowUpDown, Trash2 } from 'lucide-react'
import { TagBadge } from '@renderer/components/TagBadge'

interface BooksColumnsProps {
  onDelete?: (isbn: string, title: string) => Promise<void>
  isDeleting?: boolean
}

export function getBooksColumns({
  onDelete,
  isDeleting
}: BooksColumnsProps = {}): ColumnDef<Book>[] {
  return [
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
        return <div className="font-medium truncate max-w-64">{title || '-'}</div>
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
    ...(onDelete
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(row.original.isbn, row.original.title)}
                  className="text-destructive hover:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="size-4" />
                </Button>
              )
            }
          } as ColumnDef<Book>
        ]
      : [])
  ]
}
