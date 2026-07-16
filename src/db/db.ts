import { init } from "@instantdb/react"
import schema from "@/instant.schema"

const appId = import.meta.env.VITE_INSTANT_APP_ID as string

if (!appId) {
  throw new Error(
    "Missing VITE_INSTANT_APP_ID. Add it to your .env file. See .env.example.",
  )
}

export const db = init({
  appId,
  schema,
  useDateObjects: true,
  devtool: false,
})
