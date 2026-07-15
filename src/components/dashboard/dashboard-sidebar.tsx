import { Avatar, Chip } from "@heroui/react"
import { Sidebar } from "@heroui-pro/react"
import { db } from "#/db/db"
import type { NavItem } from "./nav-items"

import { FOOTER_ITEMS, NAV_ITEMS } from "./nav-items"

interface DashboardSidebarProps {
  pathname: string
  basePath?: string
  disableNavigation?: boolean
}

export function DashboardSidebar({
  basePath = "",
  disableNavigation = false,
  pathname,
}: DashboardSidebarProps) {
  return (
    <>
      <Sidebar>
        <SidebarContents
          basePath={basePath}
          disableNavigation={disableNavigation}
          pathname={pathname}
        />
      </Sidebar>
      <Sidebar.Mobile>
        <SidebarContents
          basePath={basePath}
          disableNavigation={disableNavigation}
          idPrefix="mobile-"
          pathname={pathname}
        />
      </Sidebar.Mobile>
    </>
  )
}

interface SidebarContentsProps {
  basePath: string
  disableNavigation: boolean
  pathname: string
  idPrefix?: string
}

function SidebarContents({
  basePath,
  disableNavigation,
  idPrefix = "",
  pathname,
}: SidebarContentsProps) {
  const { user } = db.useAuth()
  const email = user?.email ?? ""
  const displayName = email ? (email.split("@")[0] ?? email) : "Account"
  const initials = email ? email.slice(0, 2).toUpperCase() : "IV"

  return (
    <>
      <Sidebar.Header>
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar className="size-9">
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-col" data-sidebar="label">
            <span className="text-foreground truncate text-sm font-medium leading-tight">
              {displayName}
            </span>
            <span className="text-muted truncate text-xs font-medium leading-tight">
              {email}
            </span>
          </div>
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Menu aria-label="Dashboard navigation">
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.href}
                basePath={basePath}
                disableNavigation={disableNavigation}
                idPrefix={idPrefix}
                item={item}
                pathname={pathname}
              />
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <Sidebar.Menu aria-label="Account">
          {FOOTER_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              basePath={basePath}
              disableNavigation={disableNavigation}
              idPrefix={idPrefix}
              item={item}
              pathname={pathname}
            />
          ))}
        </Sidebar.Menu>
      </Sidebar.Footer>
    </>
  )
}

interface SidebarNavItemProps {
  basePath: string
  disableNavigation: boolean
  idPrefix: string
  item: NavItem
  pathname: string
}

function SidebarNavItem({
  basePath,
  disableNavigation,
  idPrefix,
  item,
  pathname,
}: SidebarNavItemProps) {
  const Icon = item.icon
  const fullHref = basePath + item.href
  const isCurrent =
    item.href === "/"
      ? pathname === fullHref ||
        pathname === basePath ||
        pathname === `${basePath}/`
      : pathname === fullHref || pathname.startsWith(`${fullHref}/`)

  return (
    <Sidebar.MenuItem
      href={disableNavigation ? undefined : fullHref}
      id={`${idPrefix}${item.href}`}
      isCurrent={isCurrent}
      textValue={item.label}
    >
      <Sidebar.MenuIcon>
        <Icon className="size-4" />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
      {item.badge ? (
        <Sidebar.MenuChip>
          <Chip color="success" size="sm" variant="soft">
            {item.badge}
          </Chip>
        </Sidebar.MenuChip>
      ) : null}
    </Sidebar.MenuItem>
  )
}
