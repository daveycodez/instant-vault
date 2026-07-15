import { Gear } from "@gravity-ui/icons"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_dashboard/dashboard/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-10 pt-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">Settings</h2>
        <p className="text-muted text-sm">
          Manage your account and preferences.
        </p>
      </header>

      <div className="border-separator bg-surface flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed p-12 text-center">
        <Gear className="text-muted size-6" />
        <span className="text-muted text-sm">Settings — coming soon.</span>
      </div>
    </div>
  )
}
