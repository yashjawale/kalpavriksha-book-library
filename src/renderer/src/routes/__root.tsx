import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { SidebarProvider, SidebarTrigger } from '@renderer/components/ui/sidebar'
import { AppSidebar } from '@renderer/components/AppSidebar'
// Supports weights 100-900
// import '@fontsource-variable/inter'
import '@fontsource/fira-sans'

const RootLayout = () => (
  <>
    <div className="text-foreground">
      <SidebarProvider>
        <AppSidebar />
        <main className="p-4 w-full max-w-full overflow-x-hidden">
          <SidebarTrigger className="mb-2" />
          <Outlet />
        </main>
      </SidebarProvider>
      <TanStackRouterDevtools />
    </div>
  </>
)

export const Route = createRootRoute({ component: RootLayout })
