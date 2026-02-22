import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import Logo from '../assets/images/logo.svg'

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  const [version, setVersion] = useState<string>('Loading...')

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const appVersion = await window.api.app.getVersion()
        setVersion(appVersion)
      } catch (error) {
        console.error('Failed to load version:', error)
        setVersion('Unknown')
      }
    }

    if (open) {
      loadVersion()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <img src={Logo} alt="Logo" width={64} />
            <div>
              <DialogTitle className="text-2xl">Kalpavriksha Book Library</DialogTitle>
              <DialogDescription>Version {version}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              A powerful library management system built with Electron, React, and TypeScript.
            </p>
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Kalpavriksha Book Library. All rights reserved.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
