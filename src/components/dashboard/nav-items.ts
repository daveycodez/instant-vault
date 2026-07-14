import {
  ArrowRightFromSquare,
  ChartColumn,
  CircleQuestion,
  Gear,
  House,
  ListCheck,
  Receipt,
} from "@gravity-ui/icons"
import type { ComponentType } from "react"

export type NavItem = {
  readonly href: string
  readonly label: string
  readonly icon: ComponentType<{ className?: string }>
  readonly badge?: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", icon: House, label: "Dashboard" },
  { href: "/dashboard/orders", icon: Receipt, label: "Orders" },
  {
    badge: "New",
    href: "/dashboard/tracker",
    icon: ListCheck,
    label: "Tracker",
  },
  {
    href: "/dashboard/analytics",
    icon: ChartColumn,
    label: "Analytics",
  },
  { href: "/dashboard/settings", icon: Gear, label: "Settings" },
] as const

export const FOOTER_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard/help",
    icon: CircleQuestion,
    label: "Help & Information",
  },
  {
    href: "/logout",
    icon: ArrowRightFromSquare,
    label: "Log out",
  },
] as const
