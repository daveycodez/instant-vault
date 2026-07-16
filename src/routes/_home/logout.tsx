import { Spinner, toast } from "@heroui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { db } from "@/db/db"

export const Route = createFileRoute("/_home/logout")({
  component: LogoutPage,
})

function LogoutPage() {
  const navigate = useNavigate()

  useEffect(() => {
    db.auth
      .signOut()
      .then(() => {
        navigate({ to: "/", replace: true })
      })
      .catch((error) => {
        navigate({ to: "/", replace: true })
        toast.danger(error.body?.message)
      })
  }, [navigate])

  return (
    <main className="flex flex-1 items-center justify-center">
      <Spinner size="lg" />
    </main>
  )
}
