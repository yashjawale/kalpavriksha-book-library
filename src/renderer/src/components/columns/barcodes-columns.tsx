import type { ColumnDef } from '@tanstack/react-table'
import type { Book } from '@renderer/types/book'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Trash2 } from 'lucide-react'
import { TagBadge } from '@renderer/components/TagBadge'

interface BarcodesColumnsProps {
  onPrintCountChange?: (isbn: string, count: number) => void
  printCounts?: Record<string, number>
  onDelete?: (isbn: string, title: string) => void
  isDeleting?: boolean
}

export function getBarcodesColumns({
  onPrintCountChange,
  printCounts,
  onDelete,
  isDeleting
}: BarcodesColumnsProps = {}): ColumnDef<Book>[] {
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
      header: 'Title',
      cell: ({ row }) => {
        const title = row.getValue('title') as string
        return (
          <div className="font-medium truncate" title={title}>
            {title}
          </div>
        )
      }
    },
    {
      accessorKey: 'isbn',
      header: 'ISBN',
      cell: ({ row }) => {
        return <div className="font-mono text-sm">{row.getValue('isbn')}</div>
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
      accessorKey: 'totalStock',
      header: 'Codes',
      cell: ({ row }) => {
        const isbn = row.original.isbn
        const stock = row.getValue('totalStock') as number
        const printCount = printCounts?.[isbn] ?? stock
        return onPrintCountChange ? (
          <Input
            type="number"
            min="0"
            value={printCount}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 0
              onPrintCountChange(isbn, Math.max(0, newValue))
            }}
            className="w-20"
          />
        ) : (
          <div>{printCount}</div>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.original.isbn, row.original.title)}
            className="text-destructive hover:text-destructive"
            disabled={isDeleting}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null
      }
    }
  ]
}
