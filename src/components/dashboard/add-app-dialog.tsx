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
import { createApp } from "@/server/mutations.functions"

const FORM_ID = "add-app-form"

export function AddAppDialog() {
  const { user } = db.useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const onSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.refresh_token) return

    const form = new FormData(e.currentTarget)
    setIsPending(true)

    try {
      await createApp({
        data: {
          token: user.refresh_token,
          appId: String(form.get("appId") ?? ""),
          adminToken: String(form.get("adminToken") ?? ""),
        },
      })
      toast.success("App added")
      setIsOpen(false)
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to add app")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <Button size="sm" onPress={() => setIsOpen(true)}>
        <Plus className="size-4" />
        Add app
      </Button>

      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container placement="auto">
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Add InstantDB app</Modal.Heading>
              <p className="text-muted mt-1.5 text-sm leading-5">
                Store an app so its database can be backed up. The admin token
                is encrypted before it is saved.
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
                  name="appId"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>App ID</Label>
                  <Input
                    placeholder="00000000-0000-0000-0000-000000000000"
                    autoFocus
                  />
                </TextField>
                <TextField
                  isRequired
                  name="adminToken"
                  variant="secondary"
                  className="w-full"
                >
                  <Label>Admin token</Label>
                  <Input placeholder="Admin token" autoComplete="off" />
                </TextField>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary" isDisabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form={FORM_ID} isPending={isPending}>
                {isPending && <Spinner color="current" size="sm" />}
                Add app
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  )
}
