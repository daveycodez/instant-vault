import { collections } from "@/db/collections"
import { createLofi } from "@/lib/instant-tanstack-db/create-lofi"

export const lofi = createLofi(collections)
