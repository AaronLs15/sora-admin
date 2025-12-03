// components/AppSidebar.tsx
import * as React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Calendar, Home, LogOut, LandPlotIcon, HomeIcon, PlusSquareIcon, EditIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
  { title: "Terrenos", to: "/terrenos", icon: LandPlotIcon },
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
    <Sidebar variant="sidebar" collapsible="offcanvas" className="border-r border-border bg-sidebar">
      {/* rail (área estrecha clicable para expandir/colapsar en desktop) */}
      <SidebarRail />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Plataforma
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {items.map((item) => {
                const active = isActivePath(item.to, item.exact);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={cn(
                        "transition-all duration-200 ease-in-out rounded-lg group",
                        active
                          ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <NavLink to={item.to} onClick={handleNavClick} end={item.exact} className="flex items-center gap-3 px-3 py-2">
                        <item.icon className={cn("size-4", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 opacity-50" />

        {/* Footer con logout */}
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Cerrar sesión"
                className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors rounded-lg"
              >
                <NavLink to="/logout" onClick={handleNavClick} className="flex items-center gap-3 px-3 py-2">
                  <LogOut className="size-4" />
                  <span className="font-medium">Cerrar sesión</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  )
}
