import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Card, CardHeader, CardContent } from '@renderer/components/ui/card'
import PageTitle from '@renderer/components/ui/page-title'
import { Edit2, Tag as TagIcon } from 'lucide-react'
import type { Tag } from '@renderer/types/book'
import { TagBadge } from '@renderer/components/TagBadge'
import { TAG_COLOR_OPTIONS, TAG_COLOR_MAP } from '@renderer/utils/tag-colors'
import { cn } from '@renderer/lib/utils'

export const Route = createFileRoute('/tags')({
  component: TagsPage
})

function TagsPage() {
  const queryClient = useQueryClient()
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<{ name: string; description: string; color: string }>({
    name: '',
    description: '',
    color: ''
  })

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: async () => await window.api.tags.getAll()
  })

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number
      name: string
      description?: string
      color?: string
    }) => {
      return await window.api.tags.update(data.id, {
        name: data.name,
        description: data.description,
        color: data.color || undefined
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setIsDialogOpen(false)
      setEditingTag(null)
    }
  })

  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag)
    setEditForm({
      name: tag.name,
      description: tag.description || '',
      color: tag.color || ''
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingTag || !editForm.name.trim()) return
    try {
      await updateMutation.mutateAsync({
        id: editingTag.id,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        color: editForm.color || undefined
      })
    } catch (error) {
      console.error('Failed to update tag:', error)
      alert('Failed to update tag. The name might already be in use.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <PageTitle title="Manage Tags" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
        {tags.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <TagBadge tag={tag} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-2 -mr-2"
                  onClick={() => handleEditClick(tag)}
                >
                  <Edit2 className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {tag.description || (
                  <span className="italic opacity-50">No description provided</span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <TagIcon className="size-12 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No tags found</h3>
          <p className="text-sm">Tags can be created when adding or editing books.</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Fiction"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description for tooltip"
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditForm((prev) => ({ ...prev, color: '' }))}
                  className={cn(
                    'h-6 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer',
                    !editForm.color
                      ? 'ring-2 ring-primary ring-offset-1 border-transparent'
                      : 'hover:bg-accent'
                  )}
                >
                  Auto
                </button>
                {TAG_COLOR_OPTIONS.map((color) => {
                  const style = TAG_COLOR_MAP[color]
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditForm((prev) => ({ ...prev, color }))}
                      className={cn(
                        'h-6 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer',
                        style.bg,
                        style.text,
                        style.border,
                        editForm.color === color
                          ? 'ring-2 ring-primary ring-offset-1'
                          : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      {color}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !editForm.name.trim()}
            >
              {updateMutation.isPending && <Spinner className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
