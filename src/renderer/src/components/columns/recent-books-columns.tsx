import type { ColumnDef } from '@tanstack/react-table'
import type { Book } from '@renderer/types/book'
import { Button } from '@renderer/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { StockInput } from './StockInput'
import { TagBadge } from '@renderer/components/TagBadge'

interface RecentBooksColumnsProps {
  onStockChange?: (isbn: string, newStock: number) => void
  onDelete?: (isbn: string) => void
  onEditDetails?: (book: Book) => void
}

export function getRecentBooksColumns({
  onStockChange,
  onDelete,
  onEditDetails
}: RecentBooksColumnsProps = {}): ColumnDef<Book>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const title = row.getValue('title') as string
        return (
          <div className="font-medium truncate max-w-64" title={title || undefined}>
            {title}
          </div>
        )
      }
    },
    {
      accessorKey: 'author',
      header: 'Author',
      cell: ({ row }) => {
        const author = row.getValue('author') as string | null
        return (
          <div
            className="text-sm text-muted-foreground truncate max-w-44"
            title={author || undefined}
          >
            {author || '-'}
          </div>
        )
      }
    },
    {
      accessorKey: 'publisher',
      header: 'Publisher',
      cell: ({ row }) => {
        const publisher = row.getValue('publisher') as string | null
        return (
          <div
            className="text-sm text-muted-foreground truncate max-w-44"
            title={publisher || undefined}
          >
            {publisher || '-'}
          </div>
        )
      }
    },
    {
      accessorKey: 'isbn',
      header: 'ISBN',
      cell: ({ row }) => {
        return <div className="font-mono text-sm text-muted-foreground">{row.getValue('isbn')}</div>
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
      }
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Added',
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date
        return (
          <div className="text-muted-foreground text-sm">
            {new Date(date).toLocaleDateString('en-IN')}
          </div>
        )
      }
    },
    {
      accessorKey: 'totalStock',
      header: 'Count',
      cell: ({ row }) => {
        const isbn = row.original.isbn
        const stock = row.getValue('totalStock') as number
        return onStockChange ? (
          <StockInput isbn={isbn} initialStock={stock} onStockChange={onStockChange} />
        ) : (
          <div>{stock}</div>
        )
      }
    },
    ...(onDelete || onEditDetails
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
              return (
                <div className="flex items-center gap-2">
                  {onEditDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditDetails(row.original)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(row.original.isbn)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              )
            }
          } as ColumnDef<Book>
        ]
      : [])
  ]
}
