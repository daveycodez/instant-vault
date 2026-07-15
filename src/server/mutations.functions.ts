import { id } from "@instantdb/admin"
import { createServerFn } from "@tanstack/react-start"
import { AwsClient } from "aws4fetch"
import { adminDb } from "./admin-db.server"
import { encryptSecret } from "./crypto.server"

/**
 * Verify the caller's InstantDB refresh token (passed from the client via
 * db.useAuth().user.refresh_token) and return the trusted user id. Never trust
 * a client-supplied id — ownership always derives from the verified token.
 */
async function requireUserId(token: string): Promise<string> {
  const user = await adminDb.auth.verifyToken(token)
  if (!user) throw new Error("Unauthorized")
  return user.id
}

/**
 * Fetch the InstantDB app's title using its admin token. Doubles as
 * credential validation — the endpoint rejects a token that doesn't belong to
 * the given app (401 bad token, 400 token/app mismatch).
 */
async function fetchAppName(
  appId: string,
  adminToken: string,
): Promise<string> {
  let res: Response
  try {
    res = await fetch(`https://api.instantdb.com/superadmin/apps/${appId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  } catch {
    throw new Error("Could not reach InstantDB to verify the app. Try again.")
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin token.")
    if (res.status === 400)
      throw new Error("Admin token does not belong to this app ID.")
    throw new Error(
      "Could not verify the app. Check the app ID and admin token.",
    )
  }

  const { app } = (await res.json().catch(() => ({}))) as {
    app?: { title?: string }
  }
  return app?.title?.trim() || appId
}

export interface CreateAppInput {
  token: string
  appId: string
  adminToken: string
}

export const createApp = createServerFn({ method: "POST" })
  .validator((data: CreateAppInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireUserId(data.token)
    const appId = data.appId.trim()
    const adminToken = data.adminToken.trim()
    const name = await fetchAppName(appId, adminToken)
    const now = new Date()

    await adminDb.transact(
      adminDb.tx.apps[id()].update({
        name,
        appId,
        encryptedAdminToken: await encryptSecret(adminToken),
        userId,
        createdAt: now,
        updatedAt: now,
      }),
    )

    return { success: true }
  })

export interface SetAppPausedInput {
  token: string
  id: string
  paused: boolean
}

export const setAppPaused = createServerFn({ method: "POST" })
  .validator((data: SetAppPausedInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireUserId(data.token)

    // Ensure the app exists and belongs to the caller before mutating.
    const { apps } = await adminDb.query({
      apps: { $: { where: { id: data.id } } },
    })
    const app = apps[0]
    if (!app || app.userId !== userId) throw new Error("App not found.")

    await adminDb.transact(
      adminDb.tx.apps[data.id].update({
        paused: data.paused,
        updatedAt: new Date(),
      }),
    )

    return { success: true }
  })

export interface CreateBucketInput {
  token: string
  name: string
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
}

/**
 * Verify the S3 credentials by issuing a signed ListObjectsV2 request against
 * the bucket. Confirms the keys are valid, the bucket exists, and it is
 * reachable/listable before we store anything. Non-destructive.
 */
async function verifyBucketAccess({
  bucket,
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
}: {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
}): Promise<void> {
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: region || "auto",
    service: "s3",
  })

  // Path-style for custom endpoints (R2/B2/MinIO); virtual-hosted for AWS.
  const base = endpoint
    ? `${endpoint.replace(/\/+$/, "")}/${bucket}`
    : `https://${bucket}.s3.${region}.amazonaws.com`

  let res: Response
  try {
    res = await client.fetch(`${base}?list-type=2&max-keys=1`, {
      method: "GET",
    })
  } catch {
    throw new Error(
      "Could not reach the bucket. Check the endpoint and region.",
    )
  }

  if (res.ok) return

  const body = await res.text().catch(() => "")
  const code = body.match(/<Code>(.*?)<\/Code>/)?.[1]
  if (code === "InvalidAccessKeyId") throw new Error("Invalid access key ID.")
  if (code === "SignatureDoesNotMatch")
    throw new Error("Invalid secret access key.")
  if (code === "NoSuchBucket" || res.status === 404)
    throw new Error("Bucket not found. Check the bucket name and region.")
  if (res.status === 403)
    throw new Error(
      "Access denied. Check the credentials and bucket permissions.",
    )
  throw new Error(`Could not verify the bucket (HTTP ${res.status}).`)
}

export const createBucket = createServerFn({ method: "POST" })
  .validator((data: CreateBucketInput) => data)
  .handler(async ({ data }) => {
    const userId = await requireUserId(data.token)
    const now = new Date()
    const endpoint = data.endpoint?.trim()
    const accessKeyId = data.accessKeyId.trim()
    const secretAccessKey = data.secretAccessKey.trim()
    const bucket = data.bucket.trim()
    const region = data.region.trim()

    await verifyBucketAccess({
      bucket,
      region,
      endpoint,
      accessKeyId,
      secretAccessKey,
    })

    await adminDb.transact(
      adminDb.tx.buckets[id()].update({
        name: data.name.trim(),
        bucket,
        region,
        ...(endpoint ? { endpoint } : {}),
        encryptedAccessKeyId: await encryptSecret(accessKeyId),
        encryptedSecretAccessKey: await encryptSecret(secretAccessKey),
        userId,
        createdAt: now,
        updatedAt: now,
      }),
    )

    return { success: true }
  })
