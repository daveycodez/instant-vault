// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react"

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string<"user" | "guest" | "admin">().optional(),
      name: i.string().optional(),
      createdAt: i.date().optional().indexed(),
      updatedAt: i.date().optional().indexed(),
    }),
    todos: i.entity({
      text: i.string(),
      done: i.boolean(),
      createdAt: i.date().indexed(),
      updatedAt: i.date().indexed(),
    }),
    apps: i.entity({
      name: i.string(),
      appId: i.string().indexed(),
      encryptedAdminToken: i.string(),
      userId: i.string().indexed(),
      paused: i.boolean().optional(),
      error: i.string().optional(),
      createdAt: i.date().indexed(),
      updatedAt: i.date().indexed(),
    }),
    buckets: i.entity({
      name: i.string(),
      bucket: i.string(),
      region: i.string(),
      endpoint: i.string().optional(),
      encryptedAccessKeyId: i.string(),
      encryptedSecretAccessKey: i.string(),
      userId: i.string().indexed(),
      createdAt: i.date().indexed(),
      updatedAt: i.date().indexed(),
    }),
  },
  links: {},
  rooms: {},
})

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema

export type { AppSchema }
export default schema
