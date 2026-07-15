import { init } from "@instantdb/admin"
import schema from "#/instant.schema"

const appId = process.env.INSTANT_APP_ID
const adminToken = process.env.INSTANT_ADMIN_TOKEN

if (!appId || !adminToken) {
  throw new Error(
    "Missing INSTANT_APP_ID or INSTANT_ADMIN_TOKEN. Add them to your .env file.",
  )
}

export const adminDb = init({
  appId,
  adminToken,
  schema,
})
