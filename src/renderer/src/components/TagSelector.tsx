import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { TagBadge } from './TagBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog'
import type { Tag } from '@renderer/types/book'

interface TagSelectorProps {
  selectedTagIds: number[]
  onTagsChange: (tagIds: number[]) => void
  showAsPreselection?: boolean
  dialogOpen?: boolean
  onDialogOpenChange?: (open: boolean) => void
}

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  showAsPreselection = false,
  dialogOpen,
  onDialogOpenChange
}: TagSelectorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Use controlled open state if provided, otherwise use internal state
  const isOpen = dialogOpen !== undefined ? dialogOpen : internalIsOpen
  const setIsOpen = onDialogOpenChange !== undefined ? onDialogOpenChange : setInternalIsOpen

  const { data: allTags = [], refetch } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id))
  const visibleTags = allTags.filter((tag) =>
    tag.name.toLocaleLowerCase().includes(newTagName.trim().toLocaleLowerCase())
  )
  const tagNameExists = allTags.some(
    (tag) => tag.name.toLocaleLowerCase() === newTagName.trim().toLocaleLowerCase()
  )

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    setIsCreating(true)
    try {
      await window.api.tags.create(newTagName.trim())
      await refetch()
      setNewTagName('')
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error('Failed to create tag. It may already exist.')
    } finally {
      setIsCreating(false)
    }
  }

  const removeTag = (tagId: number) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId))
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTags.length > 0 ? (
            selectedTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              {showAsPreselection ? 'No tags preselected' : 'No tags selected'}
            </span>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="size-4 mr-2" />
              {showAsPreselection ? 'Preselect Tags' : 'Add Tags'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showAsPreselection ? 'Preselect Tags for Books' : 'Select Tags'}
              </DialogTitle>
              <DialogDescription>
                {showAsPreselection
                  ? 'Tags selected here will be automatically applied to all new  scanned books.'
                  : 'Choose tags to categorize this book.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Create new tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search or create a tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateTag()
                    }
                  }}
                />
                <Button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim() || isCreating || tagNameExists}
                  size="sm"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* Tag cloud */}
              <div className="flex max-h-64 flex-wrap content-start items-center justify-center gap-3 overflow-y-auto py-2">
                {allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tags yet. Create one above!
                  </p>
                ) : visibleTags.length === 0 ? (
                  <p className="w-full text-sm text-muted-foreground text-center py-4">
                    No matching tags. Create “{newTagName.trim()}” above.
                  </p>
                ) : (
                  visibleTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selectedTagIds.includes(tag.id)}
                      className="inline-flex items-center justify-center rounded-full transition-transform hover:scale-105"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <TagBadge
                        tag={tag}
                        className={
                          selectedTagIds.includes(tag.id)
                            ? 'tag-selection-pulse bg-primary text-primary-foreground border-primary font-extrabold shadow-sm shadow-primary/30 ring-2 ring-primary ring-offset-2 ring-offset-background hover:bg-primary'
                            : undefined
                        }
                      />
                    </button>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
