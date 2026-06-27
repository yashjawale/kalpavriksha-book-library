import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarMenuItem,
  SidebarMenuButton
} from '@renderer/components/ui/sidebar'
import { Link } from '@tanstack/react-router'
import Logo from '../assets/images/logo.svg'
import {
  UploadIcon,
  PrinterIcon,
  BookOpen,
  Info,
  Users,
  ArrowRightLeft,
  LogIn,
  LogOut,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  TagIcon,
  Settings
} from 'lucide-react'
import { AboutDialog } from './AboutDialog'
import { useState, useEffect } from 'react'

export function AppSidebar() {
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)
  const [authStatus, setAuthStatus] = useState<{
    loggedIn: boolean
    user?: { name?: string; email?: string } | null
  }>({
    loggedIn: false
  })

  const checkAuth = async () => {
    const status = await window.api.auth.getStatus()
    setAuthStatus(status)
  }

  const handleLogin = async () => {
    const result = await window.api.auth.login()
    if (result && !result.success) {
      alert(`Login failed: ${result.error}`)
    }
    checkAuth()
  }

  const handleLogout = async () => {
    await window.api.auth.logout()
    checkAuth()
  }

  useEffect(() => {
    let mounted = true
    window.api.auth.getStatus().then((status) => {
      if (mounted) setAuthStatus(status)
    })
    return () => {
      mounted = false
    }
  }, [])

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/books', label: 'Manage Books', icon: BookOpen },
    { to: '/rentals', label: 'Rentals', icon: ArrowRightLeft },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/quickcapture', label: 'Quick Capture', icon: ScanLine },
    { to: '/reviewqueue', label: 'Review Queue', icon: ListChecks },
    { to: '/bulkadd', label: 'Bulk Add', icon: UploadIcon },
    { to: '/barcodes', label: 'Print Barcodes', icon: PrinterIcon },
    { to: '/tags', label: 'Tags', icon: TagIcon },
    { to: '/settings', label: 'Settings', icon: Settings }
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <Link to="/">
          <div className="flex items-center">
            <img src={Logo} alt="Logo" width={54} className="p-2" />
            <h1 className="text-2xl font-bold">Library</h1>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {links.map((link) => (
              <SidebarMenuItem key={link.to}>
                <SidebarMenuButton asChild>
                  <Link
                    to={link.to}
                    activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground' }}
                  >
                    <link.icon />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {authStatus.loggedIn ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span className="truncate">Logout {authStatus.user?.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogin}>
                <LogIn />
                <span>Login with Google</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setAboutDialogOpen(true)}>
              <Info />
              <span>About</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <AboutDialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen} />
    </Sidebar>
  )
}
