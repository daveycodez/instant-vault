import { collections } from "@/db/collections"
import { createLofi } from "@/lib/instant-tanstack-db/create-lofi"

export const lofi = createLofi(collections, {
  mutationDefaults: {
    insert: {
      $all: {
        createdAt: () => new Date(),
        updatedAt: () => new Date(),
      },
    },
    update: {
      $all: {
        updatedAt: () => new Date(),
      },
    },
  },
})
