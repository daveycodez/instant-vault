import { Bell, Magnifier, PersonPlus } from "@gravity-ui/icons"
import { Button } from "@heroui/react"
import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react"

import { IconButton } from "./icon-button"

export interface DashboardNavbarProps {
  title?: string
}

export function DashboardNavbar({
  title = "Good morning, Kate",
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
          <IconButton label="Search" size="sm" variant="tertiary">
            <Magnifier className="size-4" />
          </IconButton>
          <IconButton label="Notifications" size="sm" variant="tertiary">
            <Bell className="size-4" />
          </IconButton>
          <Button size="sm">
            <PersonPlus className="size-4" />
            Invite
          </Button>
        </div>
      </Navbar.Header>
    </Navbar>
  )
}
