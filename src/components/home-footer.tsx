import { Link } from "@tanstack/react-router"
import { Logo } from "#/components/logo"

export function HomeFooter() {
  return (
    <footer className="border-t border-border bg-page py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Logo className="size-4" />
          <span className="font-mono text-sm font-semibold tracking-tight text-muted-foreground">
            instantVault
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            to="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  )
}
