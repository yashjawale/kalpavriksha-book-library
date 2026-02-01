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
import { HomeIcon, UploadIcon, PrinterIcon } from 'lucide-react'

export function AppSidebar() {
  const links = [
    { to: '/', label: 'Home', icon: HomeIcon },
    { to: '/bulkadd', label: 'Bulk Add', icon: UploadIcon },
    { to: '/barcodes', label: 'Print Barcodes', icon: PrinterIcon }
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
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
