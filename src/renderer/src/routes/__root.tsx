import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SidebarProvider, SidebarTrigger } from '@renderer/components/ui/sidebar'
import { AppSidebar } from '@renderer/components/AppSidebar'
import { Toaster, toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'

import '@fontsource/fira-sans'

const RootLayout = () => {
  const navigate = useNavigate()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const bufferRef = useRef('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [dbConfigured, setDbConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.settings.get().then((settings) => {
      setDbConfigured(!!settings.databaseUrl)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Ignore on bulk add page
      if (['/bulkadd', '/rentals/new', '/stock-check'].includes(currentPath)) {
        return
      }

      // If Enter is pressed, process the buffer
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim()
        bufferRef.current = '' // Reset buffer immediately

        if (barcode) {
          try {
            const book = await window.api.books.getById(barcode)
            if (book) {
              navigate({ to: '/books/$isbn', params: { isbn: barcode } })
            } else {
              toast.error(`Book not found with code: ${barcode}`)
            }
          } catch (error) {
            console.error('Error finding book by barcode:', error)
            toast.error(`Error finding book with code: ${barcode}`)
          }
        }
        return
      }

      // Append character to buffer (only printable single characters)
      if (e.key.length === 1) {
        bufferRef.current += e.key

        // Clear buffer after a timeout to prevent accidental normal typing from being treated as a barcode
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = ''
        }, 500) // Barcode scanners type very fast
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [currentPath, navigate])

  return (
    <>
      <div>
        <SidebarProvider>
          <AppSidebar />
          <main className="p-4 w-full max-w-full overflow-x-hidden">
            <SidebarTrigger className="mb-2" />

            {dbConfigured === false && currentPath !== '/settings' ? (
              <div className="flex flex-col items-center justify-center h-[80vh] text-center">
                <h1 className="text-2xl font-bold mb-2">Database Not Configured</h1>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Please configure the PostgreSQL database URL in the settings to start using the
                  application.
                </p>
                <button
                  onClick={() => navigate({ to: '/settings' })}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Go to Settings
                </button>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </SidebarProvider>
        <TanStackRouterDevtools />
        <Toaster richColors position="top-center" />
      </div>
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
