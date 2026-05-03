import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Camera, CheckCircle2, History, Loader2, Tag } from 'lucide-react'
import { useToast } from '@renderer/hooks/use-toast'
import { TagSelector } from '@renderer/components/TagSelector'
import { Label } from '@renderer/components/ui/label'

export const Route = createFileRoute('/rapidcapture')({
  component: RapidCapture
})

type CapturedBook = {
  id: number
  frontImage: string
  backImage: string
  isbn: string | null
  title: string | null
  status: string
  isDuplicate: boolean
}

function RapidCapture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [step, setStep] = useState<'FRONT' | 'BACK'>('FRONT')
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  // New states
  const [preselectedTagIds, setPreselectedTagIds] = useState<number[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [recentCaptures, setRecentCaptures] = useState<CapturedBook[]>([])
  const [recentThumbnails, setRecentThumbnails] = useState<Record<number, string>>({})

  const { toast } = useToast()

  // Polling history
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        // @ts-ignore IPC
        const data = await window.electron.ipcRenderer.invoke('capture:getRecentCaptures')
        setRecentCaptures(data)

        // Fetch thumbnails for new items
        const newThumbnails = { ...recentThumbnails }
        let updated = false
        for (const item of data) {
          if (!newThumbnails[item.id]) {
            // @ts-ignore
            const f = await window.electron.ipcRenderer.invoke(
              'capture:getImageBase64',
              item.frontImage
            )
            newThumbnails[item.id] = f || ''
            updated = true
          }
        }
        if (updated) setRecentThumbnails(newThumbnails)
      } catch (e) {
        console.error(e)
      }
    }

    fetchRecent()
    const interval = setInterval(fetchRecent, 3000)
    return () => clearInterval(interval)
  }, [recentThumbnails])

  // Camera setup
  useEffect(() => {
    async function setupCamera(deviceId?: string) {
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error('Error accessing camera:', err)
        toast({
          title: 'Camera Error',
          description: 'Could not access the camera. Please check permissions.',
          variant: 'destructive'
        })
      }
    }
    setupCamera(selectedDeviceId)

    async function fetchDevices() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
      } catch (e) {
        console.error('Error fetching devices', e)
      }
    }
    fetchDevices()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId])

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.8)
    }
    return null
  }

  const handleCapture = async () => {
    // Flash effect
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    const imageBase64 = captureImage()
    if (!imageBase64) return

    if (step === 'FRONT') {
      setFrontImage(imageBase64)
      setStep('BACK')
    } else {
      // Capture Back and Save
      try {
        // @ts-ignore IPC
        const result = await window.electron.ipcRenderer.invoke(
          'capture:saveImages',
          frontImage,
          imageBase64,
          preselectedTagIds
        )
        if (result.success) {
          // Reset
          setFrontImage(null)
          setStep('FRONT')
          toast({
            title: 'Captured successfully',
            description: 'Images added to the processing queue.',
            duration: 1500
          })

          // Add dummy item to UI instantly to feel responsive
          setRecentCaptures((prev) => [result.data, ...prev])
          setRecentThumbnails((prev) => ({ ...prev, [result.data.id]: frontImage || '' }))
        } else {
          toast({
            title: 'Failed to save',
            description: result.error,
            variant: 'destructive'
          })
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        handleCapture()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, frontImage, preselectedTagIds])

  return (
    <div className="flex h-[calc(100vh-4rem)] p-4 gap-4 bg-muted/20">
      {/* Left side: Camera View */}
      <Card className="flex-1 bg-card shadow-xl overflow-hidden rounded-2xl border border-border/50 flex flex-col">
        <CardHeader className="text-center pb-2 flex-shrink-0">
          <CardTitle className="text-3xl font-black tracking-tight flex items-center justify-center gap-2">
            <Camera className="w-8 h-8 text-primary" />
            Rapid Capture
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Press{' '}
            <kbd className="px-2 py-1 bg-muted rounded border shadow-sm font-mono text-sm mx-1">
              Space
            </kbd>{' '}
            to capture
          </p>
        </CardHeader>
        <CardContent className="p-6 flex flex-col flex-1 gap-4">
          <div className="flex justify-end">
            <select
              className="px-3 py-2 bg-background border rounded-md text-sm shadow-sm"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              <option value="">Default Camera (Environment)</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${devices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 flex items-center justify-center shadow-inner">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {flash && (
              <div className="absolute inset-0 bg-white/80 animate-in fade-in duration-100 z-10 pointer-events-none" />
            )}

            {/* Overlay UI */}
            <div className="absolute bottom-6 flex w-full justify-center gap-4 px-6 z-20">
              <div
                className={`px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg transition-all ${step === 'FRONT' ? 'bg-primary text-primary-foreground scale-110' : 'bg-background/80 text-foreground backdrop-blur'}`}
              >
                {step === 'BACK' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                1. Front Cover
              </div>
              <div
                className={`px-6 py-3 rounded-full font-bold shadow-lg transition-all ${step === 'BACK' ? 'bg-primary text-primary-foreground scale-110' : 'bg-background/80 text-foreground backdrop-blur'}`}
              >
                2. Back Cover (Barcode)
              </div>
            </div>

            {/* Guide overlay */}
            <div className="absolute inset-0 border-2 border-white/20 m-12 rounded-lg pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-white/40 rounded-full flex items-center justify-center opacity-50">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right side: Options and History */}
      <div className="w-1/3 flex flex-col gap-4">
        <Card className="bg-card shadow-md border-border/50 shrink-0">
          <CardHeader className="py-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Batch Options
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Label className="text-sm font-semibold mb-2 block">Preselect Tags</Label>
            <TagSelector
              selectedTagIds={preselectedTagIds}
              onTagsChange={setPreselectedTagIds}
              showAsPreselection={true}
              dialogOpen={isTagDialogOpen}
              onDialogOpenChange={setIsTagDialogOpen}
            />
            <p className="text-xs text-muted-foreground mt-2">
              These tags will be applied to all books you capture in this session.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-md border-border/50 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Captures
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentCaptures.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <p>No recent captures.</p>
              </div>
            ) : (
              recentCaptures.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 bg-muted/30 p-2 rounded-lg border items-center"
                >
                  <div className="w-12 h-16 bg-black rounded overflow-hidden shrink-0">
                    {recentThumbnails[item.id] ? (
                      <img src={recentThumbnails[item.id]} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {item.title || 'Unknown Title'}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {item.isbn || 'No ISBN'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {item.status === 'PENDING' ? (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 rounded flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="text-xs bg-green-500/20 text-green-600 px-2 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Processed
                        </span>
                      )}
                      {item.isDuplicate && (
                        <span className="text-xs bg-blue-500/20 text-blue-600 px-2 rounded">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
