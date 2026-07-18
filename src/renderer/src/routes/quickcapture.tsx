import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Camera, CheckCircle2, History, Loader2, ScanLine, Tag } from 'lucide-react'
import { useToast } from '@renderer/hooks/use-toast'
import { TagSelector } from '@renderer/components/TagSelector'
import { Label } from '@renderer/components/ui/label'
import { useBarcodeScanner } from '@renderer/hooks/use-barcode-scanner'
import PageTitle from '@renderer/components/ui/page-title'

export const Route = createFileRoute('/quickcapture')({
  component: QuickCapture
})

type CapturedEntry = {
  id: number
  frontImage: string
  backImage: string
  isbn: string | null
  title: string | null
  status: string
  isDuplicate: boolean
}

type CaptureState = 'IDLE' | 'SAVING' | 'SUCCESS'

function QuickCapture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [flash, setFlash] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const currentStreamRef = useRef<MediaStream | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return localStorage.getItem('selectedCameraId') || ''
  })
  const [rotation, setRotation] = useState<number>(() => {
    return parseInt(localStorage.getItem('cameraRotation') || '0', 10)
  })

  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null)
  const [captureState, setCaptureState] = useState<CaptureState>('IDLE')
  const [preselectedTagIds, setPreselectedTagIds] = useState<number[]>([])
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)
  const [recentCaptures, setRecentCaptures] = useState<CapturedEntry[]>([])
  const [recentThumbnails, setRecentThumbnails] = useState<Record<number, string>>({})

  const { toast } = useToast()

  useEffect(() => {
    localStorage.setItem('selectedCameraId', selectedDeviceId)
  }, [selectedDeviceId])

  useEffect(() => {
    localStorage.setItem('cameraRotation', rotation.toString())
  }, [rotation])

  // Polling recent captures history
  const loadedThumbsRef = useRef<Set<number>>(new Set())
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        // @ts-ignore - IPC types are not fully defined in the global window object
        const data = await window.electron.ipcRenderer.invoke('capture:getRecentCaptures')
        setRecentCaptures(data)

        const newThumbnails: Record<number, string> = {}
        let updated = false
        for (const item of data) {
          if (!loadedThumbsRef.current.has(item.id)) {
            // @ts-ignore - IPC types are not fully defined in the global window object
            const f = await window.electron.ipcRenderer.invoke(
              'capture:getImageBase64',
              item.frontImage
            )
            if (f) {
              newThumbnails[item.id] = f
              loadedThumbsRef.current.add(item.id)
              updated = true
            }
          }
        }
        if (updated) {
          setRecentThumbnails((prev) => ({ ...prev, ...newThumbnails }))
        }
      } catch (e) {
        console.error(e)
      }
    }

    const hasPending = () => recentCaptures.some((c) => c.status === 'PENDING')

    fetchRecent()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && hasPending()) {
        fetchRecent()
      }
    }, 10000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchRecent()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Camera setup
  useEffect(() => {
    let isMounted = true

    async function setupCamera(deviceId?: string) {
      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        currentStreamRef.current = mediaStream
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
        if (isMounted) setDevices(allDevices.filter((d) => d.kind === 'videoinput'))
      } catch (e) {
        console.error('Error fetching devices', e)
      }
    }
    fetchDevices()

    const videoElement = videoRef.current

    return () => {
      isMounted = false
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
        currentStreamRef.current = null
      }
      if (videoElement) videoElement.srcObject = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId])

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    const vWidth = video.videoWidth
    const vHeight = video.videoHeight

    if (rotation === 90 || rotation === 270) {
      canvas.width = vHeight
      canvas.height = vWidth
    } else {
      canvas.width = vWidth
      canvas.height = vHeight
    }

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(video, -vWidth / 2, -vHeight / 2, vWidth, vHeight)
      ctx.restore()
      return canvas.toDataURL('image/jpeg', 0.8)
    }
    return null
  }

  const handleCapture = useCallback(async () => {
    if (captureState === 'SAVING') return

    // Flash effect
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    const imageBase64 = captureImage()
    if (!imageBase64) return

    // Grab and clear the scanned ISBN atomically
    const isbnToSave = scannedIsbn
    setScannedIsbn(null)
    setCaptureState('SAVING')

    try {
      // @ts-ignore - IPC types are not fully defined in the global window object
      const result = await window.electron.ipcRenderer.invoke(
        'capture:saveFrontImage',
        imageBase64,
        isbnToSave,
        preselectedTagIds
      )

      if (result.success) {
        setCaptureState('SUCCESS')
        setTimeout(() => setCaptureState('IDLE'), 700)
        setRecentCaptures((prev) => [result.data, ...prev.slice(0, 19)])
        setRecentThumbnails((prev) => ({ ...prev, [result.data.id]: imageBase64 }))
      } else {
        toast({ title: 'Failed to save', description: result.error, variant: 'destructive' })
        setCaptureState('IDLE')
      }
    } catch (e) {
      console.error(e)
      setCaptureState('IDLE')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureState, scannedIsbn, preselectedTagIds])

  // Barcode scanner — just stores the ISBN as an indicator; doesn't trigger capture
  useBarcodeScanner({
    onScan: (isbn) => setScannedIsbn(isbn),
    enabled: !isTagDialogOpen
  })

  // Space key triggers capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        handleCapture()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCapture])

  const captureCount = recentCaptures.length

  return (
    <div className="flex h-[calc(100vh-4rem)] p-4 gap-4 bg-muted/20">
      {/* Left: Camera View */}
      <Card className="flex-1 bg-card shadow-xl overflow-hidden rounded-2xl border border-border/50 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>
            <PageTitle title="Quick Capture" />
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Press{' '}
            <kbd className="px-2 bg-muted rounded border shadow-sm font-mono text-sm mx-1">
              Space
            </kbd>{' '}
            to capture &mdash; scan barcode first to attach ISBN
          </p>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 gap-4">
          {/* Camera controls */}
          <div className="flex gap-2">
            <select
              className="px-3 py-2 bg-background border rounded-md text-sm shadow-sm"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value, 10))}
            >
              <option value={0}>0°</option>
              <option value={90}>90° (Right)</option>
              <option value={180}>180° (Upside Down)</option>
              <option value={270}>270° (Left)</option>
            </select>
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

          {/* Camera feed */}
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 flex items-center justify-center shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transition-transform duration-300"
              style={{
                transform: `rotate(${rotation}deg) scale(${rotation % 180 === 90 ? 1.8 : 1})`
              }}
            />

            {/* Flash effect */}
            {flash && (
              <div className="absolute inset-0 bg-white/80 animate-in fade-in duration-100 z-10 pointer-events-none" />
            )}

            {/* Success overlay */}
            {captureState === 'SUCCESS' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 z-20 pointer-events-none">
                <div className="bg-green-500 rounded-full p-4 shadow-2xl">
                  <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
              </div>
            )}

            {/* Saving overlay */}
            {captureState === 'SAVING' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20 pointer-events-none">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              </div>
            )}

            {/* Scanned ISBN badge — shown prominently when a barcode is ready */}
            {scannedIsbn && captureState === 'IDLE' && (
              <div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-full shadow-2xl font-mono text-sm font-bold animate-in slide-in-from-top-2 duration-200">
                  <ScanLine className="w-4 h-4 shrink-0" />
                  <span>{scannedIsbn}</span>
                  <span className="ml-1 opacity-80 font-sans font-normal text-xs">
                    — press Space
                  </span>
                </div>
              </div>
            )}

            {/* No ISBN indicator */}
            {!scannedIsbn && captureState === 'IDLE' && (
              <div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/50 text-white/70 px-4 py-1.5 rounded-full text-xs backdrop-blur">
                  <ScanLine className="w-3 h-3" />
                  No barcode — KVB ID will be generated
                </div>
              </div>
            )}

            {/* Corner guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-12 left-12 w-8 h-8 border-t-2 border-l-2 border-white/40 rounded-tl-sm" />
              <div className="absolute top-12 right-12 w-8 h-8 border-t-2 border-r-2 border-white/40 rounded-tr-sm" />
              <div className="absolute bottom-12 left-12 w-8 h-8 border-b-2 border-l-2 border-white/40 rounded-bl-sm" />
              <div className="absolute bottom-12 right-12 w-8 h-8 border-b-2 border-r-2 border-white/40 rounded-br-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right: Options + History */}
      <div className="w-1/3 flex flex-col gap-4">
        {/* Batch Options */}
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
              Applied to all books captured in this session.
            </p>
          </CardContent>
        </Card>

        {/* Recent Captures */}
        <Card className="bg-card shadow-md border-border/50 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b shrink-0">
            <CardTitle className="text-lg flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Captures
              </span>
              {captureCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {captureCount}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentCaptures.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <Camera className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No recent captures.</p>
                <p className="text-xs mt-1">Scan a book cover to get started.</p>
              </div>
            ) : (
              recentCaptures.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 bg-muted/30 p-2 rounded-lg border items-center"
                >
                  <div className="w-12 h-16 bg-black rounded overflow-hidden shrink-0">
                    {recentThumbnails[item.id] ? (
                      <img
                        src={recentThumbnails[item.id]}
                        className="w-full h-full object-cover"
                        alt="Book cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {item.title || (
                        <span className="text-muted-foreground italic">Processing...</span>
                      )}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {item.isbn || '—'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {item.status === 'PENDING' ? (
                        <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 rounded flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      ) : (
                        <span className="text-xs bg-green-500/20 text-green-600 px-2 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {item.isDuplicate && (
                        <span className="text-xs bg-blue-500/20 text-blue-600 px-2 rounded">
                          Dup
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
