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
} satisfies InstantRules

export default rules
