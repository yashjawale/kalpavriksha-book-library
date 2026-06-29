import { Lock } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

interface LoginOverlayProps {
  title?: string
  description?: string
}

export function LoginOverlay({
  title = 'Authentication Required',
  description = 'You must be logged in to view this page.'
}: LoginOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
      <Lock className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <Button
        onClick={async () => {
          const result = await window.api.auth.login()
          if (result && !result.success) {
            alert(`Login failed: ${result.error}`)
          } else {
            window.location.reload()
          }
        }}
      >
        Login with Google
      </Button>
    </div>
  )
}
