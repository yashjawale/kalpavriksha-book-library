import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SidebarProvider, SidebarTrigger } from '@renderer/components/ui/sidebar'
import { AppSidebar } from '@renderer/components/AppSidebar'
import { Toaster } from 'sonner'
// Supports weights 100-900
// import '@fontsource-variable/inter'
import '@fontsource/fira-sans'

const RootLayout = () => (
  <>
    <div>
      <SidebarProvider>
        <AppSidebar />
        <main className="p-4 w-full max-w-full overflow-x-hidden">
          <SidebarTrigger className="mb-2" />
          <Outlet />
        </main>
      </SidebarProvider>
      <TanStackRouterDevtools />
      <Toaster richColors position="top-center" />
    </div>
  </>
)

export const Route = createRootRoute({ component: RootLayout })
