import { Plus } from "@gravity-ui/icons"
import {
  Button,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  toast,
} from "@heroui/react"
import { type SyntheticEvent, useState } from "react"
import { db } from "@/db/db"
import { createBucket } from "@/server/mutations.functions"

const FORM_ID = "add-bucket-form"

export function AddBucketDialog() {
  const { user } = db.useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.refresh_token) return

    const form = new FormData(e.currentTarget)
    setIsPending(true)

    try {
      await createBucket({
        data: {
          token: user.refresh_token,
          name: String(form.get("name") ?? ""),
          bucket: String(form.get("bucket") ?? ""),
          region: String(form.get("region") ?? ""),
          endpoint: String(form.get("endpoint") ?? ""),
          accessKeyId: String(form.get("accessKeyId") ?? ""),
          secretAccessKey: String(form.get("secretAccessKey") ?? ""),
        },
      })
      toast.success("Bucket added")
      setIsOpen(false)
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : "Failed to add bucket",
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <Button size="sm" onPress={() => setIsOpen(true)}>
        <Plus className="size-4" />
        Add bucket
      </Button>

      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Add storage bucket</Modal.Heading>
              <p className="text-muted mt-1.5 text-sm leading-5">
                Connect an S3-compatible bucket (AWS S3, Cloudflare R2,
                Backblaze B2, MinIO). Access keys are encrypted before they are
                saved.
              </p>
            </Modal.Header>
            <Modal.Body>
              <form
                id={FORM_ID}
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
              >
                <TextField
                  isRequired
                  name="name"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Name</Label>
                  <Input placeholder="Production backups" autoFocus />
                </TextField>
                <TextField
                  isRequired
                  name="bucket"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Bucket name</Label>
                  <Input placeholder="my-backup-bucket" />
                </TextField>
                <TextField
                  isRequired
                  name="region"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Region</Label>
                  <Input placeholder="us-east-1 (use 'auto' for R2)" />
                </TextField>
                <TextField
                  name="endpoint"
                  type="url"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Endpoint</Label>
                  <Input placeholder="https://…  (optional, for R2 / B2 / MinIO)" />
                </TextField>
                <TextField
                  isRequired
                  name="accessKeyId"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Access key ID</Label>
                  <Input placeholder="Access key ID" autoComplete="off" />
                </TextField>
                <TextField
                  isRequired
                  name="secretAccessKey"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Secret access key</Label>
                  <Input placeholder="Secret access key" autoComplete="off" />
                </TextField>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary" isDisabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form={FORM_ID} isPending={isPending}>
                {isPending && <Spinner color="current" size="sm" />}
                Add bucket
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  )
}
