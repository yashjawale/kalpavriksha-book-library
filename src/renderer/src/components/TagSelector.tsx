import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
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
}

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  showAsPreselection = false
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const { data: allTags = [], refetch } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id))

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
      alert('Failed to create tag. It may already exist.')
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
                  placeholder="Create new tag..."
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
                  disabled={!newTagName.trim() || isCreating}
                  size="sm"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              {/* Tag list */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tags yet. Create one above!
                  </p>
                ) : (
                  allTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={() => toggleTag(tag.id)}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="flex-1 cursor-pointer">
                        <TagBadge tag={tag} />
                      </Label>
                      {selectedTagIds.includes(tag.id) && <Check className="size-4 text-primary" />}
                    </div>
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
