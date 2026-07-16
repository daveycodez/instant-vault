import { LogoGithub } from "@gravity-ui/icons"
import { Button, buttonVariants } from "@heroui/react"
import { Link } from "@tanstack/react-router"
import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import { Logo } from "@/components/logo"

const navLinks = ["Product", "Pricing", "Docs", "About"]

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

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((label) => (
            <Button key={label} size="sm" variant="ghost">
              {label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

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

          <Link to="/dashboard" className={buttonVariants()}>
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  )
}
