import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Book } from '@renderer/types/book'
import { TagSelector } from '@renderer/components/TagSelector'

interface EditBookDialogProps {
  book: Book | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditBookDialog({ book, open, onOpenChange, onSuccess }: EditBookDialogProps) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    title: '',
    author: '',
    publisher: ''
  })

  const [tagIds, setTagIds] = useState<number[]>([])

  useEffect(() => {
    if (book && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: book.title,
        author: book.author || '',
        publisher: book.publisher || ''
      })
      setTagIds(book.bookTags?.map((bt) => bt.tag.id) || [])
    }
  }, [book, open])

  const updateDetailsMutation = useMutation({
    mutationFn: async (data: {
      isbn: string
      details: { title: string; author: string; publisher: string; tagIds: number[] }
    }) => {
      return await window.api.books.updateDetails(data.isbn, data.details)
    },
    onSuccess: (_, variables) => {
      // Invalidate both general books lists and the specific book
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.isbn] })
      onOpenChange(false)
      if (onSuccess) onSuccess()
    }
  })

  const handleConfirm = async () => {
    if (!book || !form.title.trim()) return

    try {
      await updateDetailsMutation.mutateAsync({
        isbn: book.isbn,
        details: {
          title: form.title,
          author: form.author,
          publisher: form.publisher,
          tagIds: tagIds
        }
      })
    } catch (error) {
      console.error('Error updating details:', error)
      alert('Failed to update details. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Book Details</DialogTitle>
          <DialogDescription>Update details for: {book?.isbn}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="editTitle">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="editTitle"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editAuthor">Author</Label>
            <Input
              id="editAuthor"
              value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPublisher">Publisher</Label>
            <Input
              id="editPublisher"
              value={form.publisher}
              onChange={(e) => setForm((prev) => ({ ...prev, publisher: e.target.value }))}
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label>Tags</Label>
            <TagSelector selectedTagIds={tagIds} onTagsChange={setTagIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={updateDetailsMutation.isPending || !form.title.trim()}
          >
            {updateDetailsMutation.isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
