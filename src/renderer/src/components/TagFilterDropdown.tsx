import { useState } from 'react'
import { Filter } from 'lucide-react'
import type { Tag } from '@renderer/types/book'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'

interface TagFilterDropdownProps {
  tags: Tag[]
  selectedTagIds: number[]
  onSelectionChange: (tagIds: number[]) => void
  label?: string
  activeLabel?: string
  align?: 'start' | 'center' | 'end'
  buttonClassName?: string
}

export function TagFilterDropdown({
  tags,
  selectedTagIds,
  onSelectionChange,
  label = 'Filter by Tags',
  activeLabel,
  align = 'end',
  buttonClassName
}: TagFilterDropdownProps) {
  const [search, setSearch] = useState('')
  const filteredTags = tags.filter((tag) =>
    tag.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  )

  const toggleTag = (tagId: number) => {
    onSelectionChange(
      selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    )
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            selectedTagIds.length > 0
              ? `bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200 ${buttonClassName || ''}`
              : buttonClassName
          }
        >
          <Filter className="size-4 mr-2" />
          {selectedTagIds.length > 0 && activeLabel ? activeLabel : label}
          {selectedTagIds.length > 0 && ` (${selectedTagIds.length})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 max-h-[min(80vh,32rem)] overflow-y-auto">
        <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
        <div className="px-2 pb-2" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tags..."
            aria-label="Search tags"
            className="h-8"
          />
        </div>
        <DropdownMenuSeparator />
        {filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedTagIds.includes(tag.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggleTag(tag.id)}
            >
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <p className="px-2 py-3 text-center text-sm text-muted-foreground">No matching tags</p>
        )}
        {selectedTagIds.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-800 dark:text-red-400"
              onClick={() => onSelectionChange([])}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
