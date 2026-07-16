import { LogoGithub } from "@gravity-ui/icons"
import { buttonVariants } from "@heroui/react"
import { Link } from "@tanstack/react-router"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { Logo } from "@/components/logo"

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 flex justify-center border-b border-border bg-surface px-6">
      <div className="flex w-full max-w-6xl items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="size-5" />
          <span className="font-mono text-lg font-bold tracking-tight">
            instantVault
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/pricing" className="link text-sm me-1 no-underline">
            Pricing
          </Link>

          <a
            href="https://github.com/daveycodez/instant-vault"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "secondary",
              isIconOnly: true,
            })}
          >
            <LogoGithub className="me-[0.5px]" />
          </a>

          <div className="flex items-center gap-2">
            <Link to="/dashboard" className={buttonVariants()}>
              Dashboard
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
