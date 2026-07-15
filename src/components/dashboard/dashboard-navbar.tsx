import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react"

import { ThemeToggle } from "./theme-toggle"

export interface DashboardNavbarProps {
  title?: string
}

export function DashboardNavbar({
  title = "InstantVault",
}: DashboardNavbarProps) {
  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        <h1 className="text-foreground truncate text-xl font-semibold">
          {title}
        </h1>
        <Navbar.Spacer />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </Navbar.Header>
    </Navbar>
  )
}
