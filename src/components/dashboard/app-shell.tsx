import { AppLayout } from "@heroui-pro/react"
import { useLocation, useRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { DashboardNavbar } from "./dashboard-navbar"
import { DashboardSidebar } from "./dashboard-sidebar"
import type { NavItem } from "./nav-items"
import { FOOTER_ITEMS, NAV_ITEMS } from "./nav-items"

const HOME_GREETING = "Good morning, Kate"

const ROUTE_LABELS = new Map<string, string>(
  [...NAV_ITEMS, ...FOOTER_ITEMS].map((item: NavItem) => [
    item.href,
    item.label,
  ]),
)

export interface AppShellProps {
  children: ReactNode
  basePath?: string
}

export function AppShell({ basePath = "", children }: AppShellProps) {
  const router = useRouter()
  const pathname = useLocation({ select: (loc) => loc.pathname })

  const navigate = (href: string) => router.navigate({ to: basePath + href })

  const title = useMemo(() => {
    const relative = pathname.slice(basePath.length) || "/"

    if (relative === "/" || relative === "") return HOME_GREETING

    return ROUTE_LABELS.get(relative) ?? HOME_GREETING
  }, [pathname, basePath])

  return (
    <AppLayout
      navbar={<DashboardNavbar title={title} />}
      navigate={navigate}
      sidebar={<DashboardSidebar basePath={basePath} pathname={pathname} />}
      sidebarCollapsible="offcanvas"
    >
      {children}
    </AppLayout>
  )
}
