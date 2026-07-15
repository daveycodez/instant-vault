import { ArrowRightFromSquare, Bucket, Cube, Gear } from "@gravity-ui/icons"
import type { ComponentType } from "react"

export type NavItem = {
  readonly href: string
  readonly label: string
  readonly icon: ComponentType<{ className?: string }>
  readonly badge?: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard/apps", icon: Cube, label: "Apps" },
  { href: "/dashboard/buckets", icon: Bucket, label: "Buckets" },
  { href: "/dashboard/settings", icon: Gear, label: "Settings" },
] as const

export const FOOTER_ITEMS: readonly NavItem[] = [
  {
    href: "/logout",
    icon: ArrowRightFromSquare,
    label: "Log out",
  },
] as const
