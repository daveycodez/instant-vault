import { ArrowRight, Check, Cloud, HardDrive, Server } from "@gravity-ui/icons"
import { buttonVariants, Card, Chip } from "@heroui/react"
import { createFileRoute, Link } from "@tanstack/react-router"

export const Route = createFileRoute("/_home/pricing")({
  component: PricingPage,
})

const tiers = [
  {
    id: "self-host",
    icon: Server,
    name: "Self-Host",
    price: "$0",
    cadence: "forever",
    description:
      "Run InstantVault on your own infrastructure. Open source, no limits.",
    features: [
      "Full feature set, no restrictions",
      "Your database, your storage",
      "Community support",
      "MIT licensed — fork it, ship it",
    ],
    cta: {
      label: "View on GitHub",
      href: "https://github.com/daveycodez/instant-vault",
      external: true,
      variant: "secondary" as const,
    },
    featured: false,
  },
  {
    id: "cloud",
    icon: Cloud,
    name: "Cloud",
    price: "$5",
    cadence: "per month",
    description:
      "Fully managed backups with automated scheduling. Nothing to host.",
    features: [
      "Automated daily & scheduled backups",
      "Storage - $1 per 10 GB / month",
      "Or bring your own S3-compatible bucket",
      "Priority support",
    ],
    cta: {
      label: "Start 30-day free trial",
      to: "/dashboard",
      external: false,
      variant: "primary" as const,
    },
    featured: true,
  },
]

function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 md:py-24">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 rounded-full bg-surface-secondary px-4 py-1.5">
          <HardDrive className="text-muted" />
          <span className="text-sm text-muted">Simple, honest pricing</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Pricing
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted">
          Start free by self-hosting, or let us run it for you at a flat monthly
          rate. Only pay more if you use our storage.
        </p>
      </div>

      <div className="mx-auto mt-16 grid w-full max-w-3xl gap-6 md:grid-cols-2">
        {tiers.map((tier) => {
          const Icon = tier.icon
          return (
            <Card
              key={tier.id}
              className={`relative flex flex-col p-8 ${
                tier.featured ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              {tier.featured && (
                <Chip
                  color="accent"
                  size="sm"
                  className="absolute top-6 right-6"
                >
                  Free 30-day trial
                </Chip>
              )}

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    tier.featured
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-secondary text-muted"
                  }`}
                >
                  <Icon />
                </div>
                <span className="text-lg font-semibold">{tier.name}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-muted">{tier.cadence}</span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted">
                {tier.description}
              </p>

              <ul className="mt-6 flex flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 shrink-0 text-success" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-2">
                {tier.cta.external ? (
                  <a
                    href={tier.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: tier.cta.variant,
                      fullWidth: true,
                    })}
                  >
                    {tier.cta.label}
                  </a>
                ) : (
                  <Link
                    to={tier.cta.to}
                    className={buttonVariants({
                      variant: tier.cta.variant,
                      fullWidth: true,
                    })}
                  >
                    {tier.cta.label}
                    <ArrowRight />
                  </Link>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted">
        The Cloud plan is a flat{" "}
        <span className="text-foreground">$5/month</span>. Managed storage is
        billed at <span className="text-foreground">$1 per 10 GB</span>, rounded
        up — or connect your own S3-compatible bucket and pay nothing extra for
        storage.
      </p>
    </main>
  )
}
