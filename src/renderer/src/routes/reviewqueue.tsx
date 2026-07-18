import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { useToast } from '@renderer/hooks/use-toast'
import {
  Check,
  Trash2,
  Image as ImageIcon,
  Loader2,
  CopyPlus,
  PlusSquare,
  Tag,
  ScanLine
} from 'lucide-react'
import { TagSelector } from '@renderer/components/TagSelector'
import { generateKVBId } from '@renderer/lib/utils'

export const Route = createFileRoute('/reviewqueue')({
  component: ReviewQueue
})

type CapturedBook = {
  id: number
  frontImage: string
  backImage: string
  isbn: string | null
  title: string | null
  author: string | null
  publisher: string | null
  status: 'PENDING' | 'PROCESSED'
  isDuplicate: boolean
  tagIds: string | null
}

function ReviewQueue() {
  const [queue, setQueue] = useState<CapturedBook[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [frontImgData, setFrontImgData] = useState<string | null>(null)
  const [backImgData, setBackImgData] = useState<string | null>(null)

  // Editable form state (ISBN removed — handled automatically)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const [preselectedTagIds, setPreselectedTagIds] = useState<number[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)

  const { toast } = useToast()

  const fetchQueue = async () => {
    try {
      // @ts-ignore - IPC types are not fully defined in the global window object
      const data = await window.electron.ipcRenderer.invoke('capture:getQueue')
      setQueue(data)
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id)
      } else if (data.length === 0) {
        setSelectedId(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const hasPendingRef = useRef(false)
  useEffect(() => {
    hasPendingRef.current = queue.some((q) => q.status === 'PENDING')
  }, [queue])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueue()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && hasPendingRef.current) {
        fetchQueue()
      }
    }, 10000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchQueue()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadedBookRef = useRef<{ id: number; status: string } | null>(null)

  useEffect(() => {
    const loadSelected = async () => {
      const selected = queue.find((q) => q.id === selectedId)
      if (selected) {
        const isNewBook = loadedBookRef.current?.id !== selected.id
        const justProcessed =
          loadedBookRef.current?.id === selected.id &&
          loadedBookRef.current?.status === 'PENDING' &&
          selected.status === 'PROCESSED'

        if (isNewBook || justProcessed) {
          setTitle(selected.title || '')
          setAuthor(selected.author || '')
          setPublisher(selected.publisher || '')
          loadedBookRef.current = { id: selected.id, status: selected.status }

          if (selected.tagIds) {
            try {
              setPreselectedTagIds(JSON.parse(selected.tagIds))
            } catch {
              setPreselectedTagIds([])
            }
          } else {
            setPreselectedTagIds([])
          }
        }

        if (isNewBook) {
          // @ts-ignore - IPC types are not fully defined in the global window object
          const f = await window.electron.ipcRenderer.invoke(
            'capture:getImageBase64',
            selected.frontImage
          )

          // Only load back image if it's different from the front (not a Quick Capture entry)
          const isQuickCapture = !selected.backImage || selected.backImage === selected.frontImage
          const b = isQuickCapture
            ? null
            : // @ts-ignore - IPC types are not fully defined in the global window object
              await window.electron.ipcRenderer.invoke('capture:getImageBase64', selected.backImage)

          setFrontImgData(f)
          setBackImgData(b)
        }
      } else {
        setFrontImgData(null)
        setBackImgData(null)
        loadedBookRef.current = null
      }
    }
    loadSelected()
  }, [selectedId, queue])

  const handleApprove = async (mode: 'INCREMENT' | 'NEW_ENTRY' = 'INCREMENT') => {
    if (!selectedId || !selectedItem) return
    if (!title) {
      toast({
        title: 'Validation Error',
        description: 'Title is required.',
        variant: 'destructive'
      })
      return
    }

    // Use the scanned ISBN stored in DB, or generate a KVB ID
    const finalIsbn = (selectedItem.isbn || '').trim() || generateKVBId()

    try {
      // @ts-ignore - IPC types are not fully defined in the global window object
      const result = await window.electron.ipcRenderer.invoke(
        'capture:approve',
        selectedId,
        {
          isbn: finalIsbn,
          title,
          author,
          publisher,
          tagIds: preselectedTagIds
        },
        mode
      )
      if (result.success) {
        toast({ title: 'Saved successfully', duration: 2000 })
        const nextQueue = queue.filter((q) => q.id !== selectedId)
        setQueue(nextQueue)
        if (nextQueue.length > 0) setSelectedId(nextQueue[0].id)
        else setSelectedId(null)
      } else {
        toast({ title: 'Error saving', description: result.error, variant: 'destructive' })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async () => {
    if (!selectedId) return
    try {
      // @ts-ignore - IPC types are not fully defined in the global window object
      const result = await window.electron.ipcRenderer.invoke('capture:reject', selectedId)
      if (result.success) {
        toast({ title: 'Discarded successfully', duration: 2000 })
        const nextQueue = queue.filter((q) => q.id !== selectedId)
        setQueue(nextQueue)
        if (nextQueue.length > 0) setSelectedId(nextQueue[0].id)
        else setSelectedId(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const selectedItem = queue.find((q) => q.id === selectedId)
  const isQuickCapture =
    selectedItem && (!selectedItem.backImage || selectedItem.backImage === selectedItem.frontImage)
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Sidebar Queue List */}
      <Card className="w-1/3 flex flex-col overflow-hidden bg-card border-border/50 shadow-md">
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-lg flex justify-between items-center">
            Review Queue
            <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {queue.length} items
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-2 space-y-2">
          {queue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>No books in queue.</p>
              <p className="text-sm">Capture some books to get started.</p>
            </div>
          ) : (
            queue.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedId === item.id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-background border-transparent hover:bg-muted/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="truncate pr-2 font-medium">
                    {item.title || (
                      <span className="text-muted-foreground italic">Unknown Title</span>
                    )}
                  </div>
                  {item.status === 'PENDING' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between gap-2">
                  {item.isbn ? (
                    <span className="font-mono flex items-center gap-1">
                      <ScanLine className="w-3 h-3 shrink-0" />
                      {item.isbn}
                    </span>
                  ) : (
                    <span className="italic opacity-60">KVB ID on save</span>
                  )}
                  {item.isDuplicate && (
                    <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                      Dup
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Main Review Area */}
      {selectedItem ? (
        <Card className="w-2/3 flex flex-col bg-card border-border/50 shadow-xl overflow-hidden">
          <CardContent className="flex-1 p-6 flex flex-col gap-6 overflow-auto">
            {/* Images */}
            {isQuickCapture ? (
              /* Front-only (Quick Capture) — full width */
              <div className="h-80 lg:h-112.5 xl:h-137.5 shrink-0">
                <div className="h-full bg-black rounded-lg overflow-hidden relative shadow-inner group">
                  {frontImgData ? (
                    <img
                      src={frontImgData}
                      alt="Front Cover"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 text-xs rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    Front Cover
                  </div>
                </div>
              </div>
            ) : (
              /* Front + Back side by side (Rapid Capture) */
              <div className="flex gap-4 h-80 lg:h-112.5 xl:h-137.5 shrink-0">
                <div className="flex-1 bg-black rounded-lg overflow-hidden relative shadow-inner group">
                  {frontImgData ? (
                    <img
                      src={frontImgData}
                      alt="Front Cover"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 text-xs rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    Front
                  </div>
                </div>
                <div className="flex-1 bg-black rounded-lg overflow-hidden relative shadow-inner group">
                  {backImgData ? (
                    <img
                      src={backImgData}
                      alt="Back Cover"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Loader2 className="animate-spin" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 text-xs rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    Back (Barcode)
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4 flex-1">
              {/* Status banners */}
              {selectedItem.status === 'PENDING' && (
                <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded flex items-center gap-2 text-sm border border-yellow-500/20">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Still processing background metadata extraction...
                </div>
              )}
              {selectedItem.isDuplicate && selectedItem.status === 'PROCESSED' && (
                <div className="bg-blue-500/10 text-blue-600 p-3 rounded flex items-center gap-2 text-sm border border-blue-500/20">
                  <CopyPlus className="w-4 h-4" />
                  This barcode already exists in your local catalog.
                </div>
              )}

              {/* ISBN read-only display */}
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg border text-sm">
                <ScanLine className="w-4 h-4 text-muted-foreground shrink-0" />
                {selectedItem.isbn ? (
                  <span className="font-mono text-foreground">{selectedItem.isbn}</span>
                ) : (
                  <span className="text-muted-foreground italic">
                    No barcode scanned — a KVB ID will be auto-generated on save
                  </span>
                )}
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="title">Title (Required)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Book Title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Publisher Name"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-2 bg-muted/30 p-4 rounded-lg border">
                <Label className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Selected Tags
                </Label>
                <TagSelector
                  selectedTagIds={preselectedTagIds}
                  onTagsChange={setPreselectedTagIds}
                  showAsPreselection={true}
                  dialogOpen={isTagDialogOpen}
                  onDialogOpenChange={setIsTagDialogOpen}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t bg-muted/20 flex justify-between">
            <Button variant="destructive" onClick={handleReject}>
              <Trash2 className="w-4 h-4 mr-2" /> Discard
            </Button>

            <div className="flex gap-2">
              {selectedItem.isDuplicate ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => handleApprove('NEW_ENTRY')}
                    className="shadow-sm"
                  >
                    <PlusSquare className="w-4 h-4 mr-2" /> Separate Entry
                  </Button>
                  <Button onClick={() => handleApprove('INCREMENT')} className="px-8 shadow-md">
                    <CopyPlus className="w-4 h-4 mr-2" /> Increment Stock (+1)
                  </Button>
                </>
              ) : (
                <Button onClick={() => handleApprove('INCREMENT')} className="px-8 shadow-md">
                  <Check className="w-4 h-4 mr-2" /> Save to Catalog
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card className="w-2/3 flex items-center justify-center bg-muted/10 border-dashed">
          <div className="text-center text-muted-foreground">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No Book Selected</h3>
            <p>Select a book from the queue to review and save.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
