import { Button } from '@renderer/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

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

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationBar({ currentPage, totalPages, onPageChange }: PaginationBarProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1 py-4 border-t">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(0)}
        disabled={currentPage === 0}
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        <ChevronLeft className="size-4" />
      </Button>
      {getPageRange(totalPages, currentPage).map((page, i) =>
        page === '...' ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPageChange(page)}
            className="min-w-9"
          >
            {page + 1}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages - 1)}
        disabled={currentPage === totalPages - 1}
      >
        <ChevronsRight className="size-4" />
      </Button>
    </div>
  )
}
