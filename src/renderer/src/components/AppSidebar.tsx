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

export function AppSidebar() {
  const links = [
    { to: '/', label: 'Home' },
    { to: '/bulkadd', label: 'Bulk Add' }
  ]

  return (
    <Sidebar>
      <SidebarHeader>
        <Link to="/">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="Logo" width={54} />
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
                  <Link to={link.to}>
                    {/* <link.icon /> */}
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
