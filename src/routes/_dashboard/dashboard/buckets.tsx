import { Bucket } from "@gravity-ui/icons"
import { EmptyState, Table } from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"
import { AddBucketDialog } from "@/components/dashboard/add-bucket-dialog"
import { db } from "@/db/db"
import { lofi } from "@/db/lofi"

export const Route = createFileRoute("/_dashboard/dashboard/buckets")({
  component: BucketsPage,
})

function BucketsPage() {
  const { user } = db.useAuth()
  const { data: buckets } = lofi.useFindMany(
    "buckets",
    user
      ? { where: { userId: user.id }, orderBy: { createdAt: "desc" } }
      : false,
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-10 pt-4">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-lg font-semibold">Buckets</h2>
          <p className="text-muted text-sm">
            S3-compatible destinations where backups are stored.
          </p>
        </div>
        <AddBucketDialog />
      </header>

      <Table className="min-h-[240px]">
        <Table.ScrollContainer>
          <Table.Content aria-label="Buckets" className="h-full min-w-[720px]">
            <Table.Header>
              <Table.Column isRowHeader>Name</Table.Column>
              <Table.Column>Bucket</Table.Column>
              <Table.Column>Region</Table.Column>
              <Table.Column>Endpoint</Table.Column>
              <Table.Column>Added</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                  <Bucket className="text-muted size-6" />
                  <span className="text-muted text-sm">
                    No buckets yet. Add one to store backups.
                  </span>
                </EmptyState>
              )}
            >
              {(buckets ?? []).map((bucket) => (
                <Table.Row key={bucket.id}>
                  <Table.Cell className="font-medium">{bucket.name}</Table.Cell>
                  <Table.Cell className="text-muted font-mono text-xs">
                    {bucket.bucket}
                  </Table.Cell>
                  <Table.Cell className="text-muted">
                    {bucket.region}
                  </Table.Cell>
                  <Table.Cell className="text-muted font-mono text-xs">
                    {bucket.endpoint ?? "—"}
                  </Table.Cell>
                  <Table.Cell className="text-muted">
                    {bucket.createdAt.toLocaleDateString()}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  )
}
