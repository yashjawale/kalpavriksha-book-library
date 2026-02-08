import type { ColumnDef } from '@tanstack/react-table'
import type { Book } from '@renderer/types/book'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Trash2 } from 'lucide-react'

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
        return <div className="font-medium">{row.getValue('title')}</div>
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
