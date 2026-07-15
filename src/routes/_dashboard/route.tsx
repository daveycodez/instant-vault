import { createFileRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "#/components/dashboard/app-shell"
import { HomeFooter } from "#/components/home-footer"
import { HomeHeader } from "#/components/home-header"
import { LoginForm } from "#/components/login-form"
import { db } from "#/db/db"

export const Route = createFileRoute("/_dashboard")({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div>
      <db.SignedIn>
        <AppShell>
          <Outlet />
        </AppShell>
      </db.SignedIn>
      <db.SignedOut>
        <div className="flex min-h-screen flex-col bg-background">
          <HomeHeader />
          <LoginForm />
          <HomeFooter />
        </div>
      </db.SignedOut>
    </div>
  )
}
