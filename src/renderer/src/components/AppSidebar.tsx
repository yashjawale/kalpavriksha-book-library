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
import { UploadIcon, PrinterIcon, BookOpen, Database, Info } from 'lucide-react'
import { AboutDialog } from './AboutDialog'
import { useState } from 'react'

export function AppSidebar() {
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

  const links = [
    { to: '/', label: 'Manage Books', icon: BookOpen },
    { to: '/bulkadd', label: 'Bulk Add', icon: UploadIcon },
    { to: '/barcodes', label: 'Print Barcodes', icon: PrinterIcon },
    { to: '/managedata', label: 'Manage Data', icon: Database }
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
