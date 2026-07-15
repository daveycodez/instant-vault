import {
  ArrowRight,
  Clock,
  Database,
  HardDrive,
  Shield,
} from "@gravity-ui/icons"
import { Button, Card } from "@heroui/react"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_home/")({ component: Home })

const features = [
  {
    icon: Database,
    title: "One-Click Backup",
    description:
      "Create full database snapshots with a single click. Zero configuration required.",
    accent: "bg-warning/10 text-warning",
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
    <>
      {/* Hero */}
      <section className="flex flex-col items-center px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-2 rounded-full bg-surface-secondary px-4 py-1.5">
            <HardDrive className="text-muted" />
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
            <Link to="/dashboard" className="button button--primary">
              Get Started
              <ArrowRight />
            </Link>
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
                <Icon />
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
    </>
  )
}
