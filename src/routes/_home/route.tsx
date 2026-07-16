import { createFileRoute, Outlet } from "@tanstack/react-router"
import { HomeFooter } from "@/components/home-footer"
import { HomeHeader } from "@/components/home-header"

export const Route = createFileRoute("/_home")({
  component: HomeLayout,
})

function HomeLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <HomeHeader />
      <Outlet />
      <HomeFooter />
    </div>
  )
}
