import { Badge } from './ui/badge'
import { X } from 'lucide-react'
import type { Tag } from '@renderer/types/book'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  className?: string
}

import { getTagColor } from '../utils/tag-colors'

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  const colors = getTagColor(tag)

  const badge = (
    <Badge
      variant="secondary"
      className={`${colors.bg} ${colors.text} ${colors.hover} border ${colors.border} ${className || ''}`}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:opacity-70 cursor-pointer"
          aria-label="Remove tag"
        >
          <X className="size-3" />
        </button>
      )}
    </Badge>
  )

  if (tag.description) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="inline-block cursor-help">{badge}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-50 text-sm">{tag.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return badge
}
