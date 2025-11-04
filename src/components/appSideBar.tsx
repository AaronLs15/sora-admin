// components/AppSidebar.tsx
import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Calendar, Home, LogOut, LandPlotIcon, HomeIcon, PlusSquareIcon, EditIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

// Items del menú principal (rutas existentes)
const items = [
  { title: "Dashboard", to: "/", icon: Home, exact: true },
  { title: "Terrenos", to: "/terrenos", icon: LandPlotIcon},
  { title: "Nuevo Terreno", to: "/terrenos/nuevo", icon: Calendar },
  { title: "Casas", to: "/casas", icon: HomeIcon },
  { title: "Nueva Casa", to: "/casas/nueva", icon: PlusSquareIcon },
  { title: "Leads", to: "/leads", icon: EditIcon },
  // Puedes reactivar listas cuando actives esas rutas:
  // { title: "Terrenos", to: "/terrenos", icon: MapIcon },
  // { title: "Casas", to: "/casas", icon: Home },
  
]

export function AppSidebar() {
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  // cierra el drawer en móvil al navegar
  const handleNavClick = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  // define activo (exacto para "/"; startsWith para subrutas)
  const isActivePath = React.useCallback(
    (to: string, exact?: boolean) => {
      if (exact) return location.pathname === to
      return location.pathname === to || location.pathname.startsWith(to)
    },
    [location.pathname]
  )

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" >
      {/* rail (área estrecha clicable para expandir/colapsar en desktop) */}
      <SidebarRail />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sora ByR</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActivePath(item.to, item.exact)}
                    tooltip={item.title}
                  >
                    <NavLink to={item.to} onClick={handleNavClick} end={item.exact}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Footer con logout */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Cerrar sesión">
                <NavLink to="/logout" onClick={handleNavClick}>
                  <LogOut />
                  <span>Cerrar sesión</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
