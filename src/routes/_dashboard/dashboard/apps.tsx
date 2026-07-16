import { Cube, Pause, Play, TriangleExclamation } from "@gravity-ui/icons"
import {
  Button,
  Chip,
  EmptyState,
  Spinner,
  Table,
  Tooltip,
  toast,
} from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { AddAppDialog } from "@/components/dashboard/add-app-dialog"
import { IconButton } from "@/components/dashboard/icon-button"
import { db } from "@/db/db"
import { setAppPaused } from "@/server/mutations.functions"

export const Route = createFileRoute("/_dashboard/dashboard/apps")({
  component: AppsPage,
})

interface AppItem {
  id: string
  name: string
  appId: string
  paused?: boolean
  error?: string
  createdAt: Date
}

function AppRow({ app, token }: { app: AppItem; token: string | undefined }) {
  const [isPending, setIsPending] = useState(false)
  const paused = app.paused ?? false

  const toggle = async () => {
    if (!token) return
    setIsPending(true)
    try {
      await setAppPaused({ data: { token, id: app.id, paused: !paused } })
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to update app",
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Table.Row>
      <Table.Cell className="font-medium">
        <span className="flex items-center gap-1.5">
          {app.name}
          {app.error ? (
            <Tooltip delay={0}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label="Backup error"
              >
                <TriangleExclamation className="text-danger size-4" />
              </Button>
              <Tooltip.Content>{app.error}</Tooltip.Content>
            </Tooltip>
          ) : null}
        </span>
      </Table.Cell>
      <Table.Cell className="text-muted font-mono text-xs">
        {app.appId}
      </Table.Cell>
      <Table.Cell>
        <Chip size="sm" variant="soft" color={paused ? "warning" : "success"}>
          {paused ? "Paused" : "Active"}
        </Chip>
      </Table.Cell>
      <Table.Cell className="text-muted">
        {app.createdAt.toLocaleDateString()}
      </Table.Cell>
      <Table.Cell>
        <IconButton
          label={paused ? "Resume" : "Pause"}
          size="sm"
          variant="tertiary"
          isPending={isPending}
          isDisabled={isPending || !token}
          onPress={toggle}
        >
          {isPending ? (
            <Spinner color="current" size="sm" />
          ) : paused ? (
            <Play className="size-4" />
          ) : (
            <Pause className="size-4" />
          )}
        </IconButton>
      </Table.Cell>
    </Table.Row>
  )
}

function AppsPage() {
  const { user } = db.useAuth()
  const { data } = db.useQuery(
    user
      ? {
          apps: {
            $: {
              where: { userId: user.id },
              order: { createdAt: "desc" },
            },
          },
        }
      : null,
  )
  const apps = data?.apps

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-10 pt-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-lg font-semibold">Apps</h2>
          <p className="text-muted text-sm">
            InstantDB apps registered for backup.
          </p>
        </div>
        <AddAppDialog />
      </header>

      <Table className="min-h-[240px]">
        <Table.ScrollContainer>
          <Table.Content aria-label="Apps" className="h-full min-w-[680px]">
            <Table.Header>
              <Table.Column isRowHeader>Name</Table.Column>
              <Table.Column>App ID</Table.Column>
              <Table.Column>Status</Table.Column>
              <Table.Column>Added</Table.Column>
              <Table.Column aria-label="Actions" />
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                  <Cube className="text-muted size-6" />
                  <span className="text-muted text-sm">
                    No apps yet. Add one to get started.
                  </span>
                </EmptyState>
              )}
            >
              {(apps ?? []).map((app) => (
                <AppRow key={app.id} app={app} token={user?.refresh_token} />
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  )
}
