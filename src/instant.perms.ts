// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react"

const rules = {
  attrs: { allow: { $default: "false" } },
  $users: {
    allow: {
      create: "true",
    },
  },
  todos: {
    allow: {
      view: "true",
      create: "true",
      update: "true",
      delete: "true",
    },
  },
  apps: {
    allow: {
      view: "auth.id == data.userId",
      create: "false",
      update: "false",
      delete: "false",
    },
    // Encrypted secrets are never sent to the client — only the admin SDK
    // (which bypasses permissions) reads them for backups.
    fields: {
      encryptedAdminToken: "false",
    },
  },
  buckets: {
    allow: {
      view: "auth.id == data.userId",
      create: "false",
      update: "false",
      delete: "false",
    },
    fields: {
      encryptedAccessKeyId: "false",
      encryptedSecretAccessKey: "false",
    },
  },
} satisfies InstantRules

export default rules
