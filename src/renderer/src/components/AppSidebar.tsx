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
  ClipboardCheck,
  ScanLine,
  TagIcon,
  Settings,
  History,
  Trash2
} from 'lucide-react'
import { AboutDialog } from './AboutDialog'
import { UpdateNotice } from './UpdateNotice'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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
      toast.error(`Login failed: ${result.error}`)
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
    { to: '/rentals', label: 'Active Loans', icon: ArrowRightLeft },
    { to: '/rentals/past', label: 'Past Loans', icon: History },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/quickcapture', label: 'Quick Capture', icon: ScanLine },
    { to: '/reviewqueue', label: 'Review Queue', icon: ListChecks },
    { to: '/stock-check', label: 'Stock Check', icon: ClipboardCheck },
    { to: '/bulkadd', label: 'Add Books', icon: UploadIcon },
    { to: '/barcodes', label: 'Print Barcodes', icon: PrinterIcon },
    { to: '/tags', label: 'Tags', icon: TagIcon },
    { to: '/discarded', label: 'Discarded Books', icon: Trash2 },
    { to: '/settings', label: 'Settings', icon: Settings }
  ]

  return (
    <Sidebar>
      <div className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full"
          viewBox="0 0 256 800"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sidebar-wave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.18" />
            </linearGradient>
          </defs>
          <path d="M0 485C48 455 83 475 122 495s82 24 134-8v313H0Z" fill="url(#sidebar-wave)" />
          <path
            d="M0 565c48-35 90-20 129 5s80 30 127 0v230H0Z"
            fill="var(--primary)"
            fillOpacity="0.08"
          />
          <path
            d="M188 800c-2-76-12-119-35-172m34 119c17-38 35-61 58-77m-65 21c-16-32-34-49-58-61m59 3c13-32 28-51 49-65"
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.16"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g fill="var(--primary)" fillOpacity="0.1">
            <ellipse cx="153" cy="626" rx="19" ry="9" transform="rotate(34 153 626)" />
            <ellipse cx="226" cy="669" rx="20" ry="9" transform="rotate(-38 226 669)" />
            <ellipse cx="147" cy="707" rx="19" ry="9" transform="rotate(35 147 707)" />
            <ellipse cx="230" cy="615" rx="18" ry="8" transform="rotate(-48 230 615)" />
          </g>
        </svg>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <SidebarHeader>
            <Link to="/">
              <div className="flex items-center">
                <img src={Logo} alt="Logo" width={64} className="p-2" />
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
                        activeProps={{ className: 'bg-primary text-white hover:bg-primary/90' }}
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
              <UpdateNotice />
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
        </div>
      </div>
      <SidebarRail />
      <AboutDialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen} />
    </Sidebar>
  )
}
