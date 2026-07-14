import { Button, Card } from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowRight,
  Clock,
  Database,
  Github,
  HardDrive,
  Shield,
} from "lucide-react"
import { Logo } from "#/components/logo"

const navLinks = ["Product", "Pricing", "Docs", "About"]

export const Route = createFileRoute("/")({ component: Home })

const features = [
  {
    icon: Database,
    title: "One-Click Backup",
    description:
      "Create full database snapshots with a single click. Zero configuration required.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: Clock,
    title: "Auto Scheduling",
    description:
      "Set it and forget it. Automated daily, weekly, or custom backup schedules keep your data safe.",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: Shield,
    title: "Instant Restore",
    description:
      "Restore any backup to any database in seconds. Point-in-time recovery included.",
    accent: "bg-success/10 text-success",
  },
]

function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex justify-center bg-white px-6">
        <div className="flex w-full max-w-6xl items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Logo className="size-5" />

            <span className="font-mono text-lg font-bold tracking-tight">
              instantVault
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((label) => (
              <Button key={label} size="sm" variant="ghost">
                {label}
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary">
              <Github size={16} />
              Star us
            </Button>
            <Button size="sm" variant="primary">
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-2 rounded-full bg-surface-secondary px-4 py-1.5">
            <HardDrive size={14} className="text-muted" />
            <span className="text-sm text-muted">Backups for InstantDB</span>
          </div>

          <div className="flex flex-col items-center gap-4">
            <h1 className="max-w-xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Never lose your <span className="text-primary">InstantDB</span>{" "}
              data
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted">
              Secure, automated backups for your InstantDB databases. Set it up
              in seconds and sleep easy.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="primary" size="lg">
              Get Started
              <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="flex justify-center px-6 pb-28">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description, accent }) => (
            <Card key={title} className="p-6">
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
              >
                <Icon size={20} />
              </div>
              <Card.Header className="p-0">
                <Card.Title className="text-base">{title}</Card.Title>
                <Card.Description className="mt-1 text-sm leading-relaxed">
                  {description}
                </Card.Description>
              </Card.Header>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 text-center">
        <p className="text-sm text-muted">
          InstantVault &mdash; Backups for InstantDB
        </p>
      </footer>
    </div>
  )
}
