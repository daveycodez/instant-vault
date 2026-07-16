import { db } from "@/db/db"
import schema from "@/instant.schema"
import { createCollections } from "@/lib/instant-tanstack-db/create-collections"

export const collections = createCollections(db, schema)
