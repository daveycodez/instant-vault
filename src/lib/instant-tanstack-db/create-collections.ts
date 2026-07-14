import type {
  CreateParams,
  EntitiesDef,
  InstantSchemaDef,
  InstantUnknownSchema,
  InstaQLEntity,
  InstaQLParams,
  LinksDef,
  RoomsDef,
} from "@instantdb/core"
import type { InstantReactWebDatabase } from "@instantdb/react"
import type { IR, LoadSubsetOptions } from "@tanstack/db"
import { BTreeIndex } from "@tanstack/db"
import { type Collection, createCollection } from "@tanstack/react-db"

type AnyInstantSchema = InstantSchemaDef<
  EntitiesDef,
  LinksDef<EntitiesDef>,
  RoomsDef
>

type Row = { id: string } & Record<string, unknown>
type InstantWhere = Record<string, unknown>
type InstantDollar = {
  where?: InstantWhere
  order?: Record<string, "asc" | "desc">
  limit?: number
  offset?: number
}

// ---------------------------------------------------------------------------
// IR translation helpers
// ---------------------------------------------------------------------------

function fieldOf(e: IR.BasicExpression): string {
  if (e.type !== "ref") throw new Error("expected ref")
  // path is [sourceAlias, ...fieldPath] for aliased refs; Instant uses
  // dot-joined field paths.
  const path = e.path.length > 1 ? e.path.slice(1) : e.path
  return path.join(".")
}

function litOf(e: IR.BasicExpression): unknown {
  if (e.type !== "val") throw new Error("expected val")
  return e.value
}

// eq(ref, val) or eq(val, ref) — normalize.
function refVal(args: Array<IR.BasicExpression>): [string, unknown] {
  const [a, b] = args
  if (!a || !b) throw new Error("expected two args")
  if (a.type === "ref") return [fieldOf(a), litOf(b)]
  if (b.type === "ref") return [fieldOf(b), litOf(a)]
  throw new Error("expected a ref operand")
}

/**
 * Match lofi's relation-filter annotation shape (see create-lofi.ts header):
 * or(eq(ref "<label>.<field>", v), isUndefined(ref "<label>.<field>")) —
 * locally vacuous, but the dotted pseudo-field names an InstaQL association
 * filter. Returns the tight `{ "<label>.<field>": v }` clause, or null if the
 * expression isn't an annotation.
 */
function matchRelationAnnotation(
  expr: IR.BasicExpression,
): InstantWhere | null {
  if (expr.type !== "func" || expr.name !== "or" || expr.args.length !== 2)
    return null
  const [a, b] = expr.args
  const eqArm = [a, b].find((e) => e?.type === "func" && e.name === "eq")
  const undefArm = [a, b].find(
    (e) =>
      e?.type === "func" && (e.name === "isUndefined" || e.name === "isNull"),
  )
  if (eqArm?.type !== "func" || undefArm?.type !== "func") return null
  const undefRef = undefArm.args[0]
  if (undefRef?.type !== "ref") return null
  try {
    const [field, value] = refVal(eqArm.args)
    if (!field.includes(".")) return null
    if (fieldOf(undefRef) !== field) return null
    return { [field]: value }
  } catch {
    return null
  }
}

/**
 * Find a top-level AND-conjunct that bounds the result set via a UNIQUE
 * field: eq(uniqueField, v) or inArray(uniqueField, [...]). Such a conjunct
 * limits the candidate rows to at most one per value — if all candidates are
 * local, EVERY predicate over them (remaining conjuncts, order, limit) is
 * locally decidable, regardless of translatability. Conjuncts inside OR/NOT
 * don't bound the result and are ignored.
 */
export function uniqueBoundOf(
  expr: IR.BasicExpression,
  uniqueFields: ReadonlySet<string>,
): { field: string; values: Array<unknown> } | null {
  if (expr.type !== "func") return null
  if (expr.name === "and") {
    for (const arg of expr.args) {
      const bound = arg && uniqueBoundOf(arg, uniqueFields)
      if (bound) return bound
    }
    return null
  }
  try {
    if (expr.name === "eq") {
      const [field, value] = refVal(expr.args)
      if (!uniqueFields.has(field)) return null
      if (value === null || typeof value === "object") return null
      return { field, values: [value] }
    }
    if (expr.name === "in" || expr.name === "inArray") {
      const [field, value] = refVal(expr.args)
      if (!uniqueFields.has(field)) return null
      if (!Array.isArray(value) || value.length === 0) return null
      return { field, values: value }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Resolve the strictSubsets policy for one entity: boolean = global, object =
 * per-entity with `$all` fallback. Pure — exported for tests.
 */
export function resolveStrict(
  option:
    | boolean
    | ({ $all?: boolean } & Record<string, boolean | undefined>)
    | undefined,
  name: string,
): boolean {
  if (option === undefined) return false
  if (typeof option === "boolean") return option
  return option[name] ?? option.$all ?? false
}

/**
 * Resolve the localFirst policy for one entity: string = global, object =
 * per-entity with `$all` fallback. Pure — exported for tests.
 */
export function resolveLocalFirst(
  option:
    | LocalFirstMode
    | ({ $all?: LocalFirstMode } & Record<string, LocalFirstMode | undefined>)
    | undefined,
  name: string,
): LocalFirstMode {
  if (option === undefined) return "matching"
  if (typeof option === "string") return option
  return option[name] ?? option.$all ?? "matching"
}

/**
 * Minimal single-row evaluator for the where IR, mirroring TanStack's
 * SQL-3VL semantics (comparisons with null/undefined are UNKNOWN → null;
 * and/or/not propagate). Used ONLY as the local-overlap heuristic for
 * stale-while-revalidate: `true` means this row would render for the query
 * as local data stands. Unsupported shapes return null — conservative: the
 * row doesn't count as a match, so the subset waits for the server instead
 * of risking a false serve.
 */
export function evalLocalWhere(
  expr: IR.BasicExpression,
  row: Record<string, unknown>,
): boolean | null {
  if (expr.type !== "func") return null

  const norm = (v: unknown): unknown => (v instanceof Date ? v.getTime() : v)
  const unknown = (v: unknown) => v === null || v === undefined
  const operand = (e: IR.BasicExpression | undefined): unknown => {
    if (e?.type === "val") return e.value
    if (e?.type === "ref") {
      const path = e.path.length > 1 ? e.path.slice(1) : e.path
      let v: unknown = row
      for (const p of path) {
        if (v === null || v === undefined) return v
        v = (v as Record<string, unknown>)[p]
      }
      return v
    }
    return undefined // nested function operands: unsupported → unknown
  }

  switch (expr.name) {
    case "and": {
      let hasUnknown = false
      for (const arg of expr.args) {
        const r = arg ? evalLocalWhere(arg, row) : null
        if (r === false) return false
        if (r === null) hasUnknown = true
      }
      return hasUnknown ? null : true
    }
    case "or": {
      let hasUnknown = false
      for (const arg of expr.args) {
        const r = arg ? evalLocalWhere(arg, row) : null
        if (r === true) return true
        if (r === null) hasUnknown = true
      }
      return hasUnknown ? null : false
    }
    case "not": {
      const r = expr.args[0] ? evalLocalWhere(expr.args[0], row) : null
      return r === null ? null : !r
    }
    case "eq": {
      const a = norm(operand(expr.args[0]))
      const b = norm(operand(expr.args[1]))
      if (unknown(a) || unknown(b)) return null
      return a === b
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const a = norm(operand(expr.args[0])) as number
      const b = norm(operand(expr.args[1])) as number
      if (unknown(a) || unknown(b)) return null
      if (expr.name === "gt") return a > b
      if (expr.name === "gte") return a >= b
      if (expr.name === "lt") return a < b
      return a <= b
    }
    case "in":
    case "inArray": {
      const v = norm(operand(expr.args[0]))
      const arr = operand(expr.args[1])
      if (unknown(v)) return null
      if (!Array.isArray(arr)) return null
      return arr.some((item) => norm(item) === v)
    }
    case "isNull":
      return operand(expr.args[0]) === null
    case "isUndefined":
      return operand(expr.args[0]) === undefined
    default:
      return null // like/ilike/functions: not worth risking a false serve
  }
}

/**
 * Translate TanStack DB's where-expression IR into an InstantDB `where`
 * clause. The IR is a small tree: PropRef {path}, Value {value},
 * Func {name, args}. Throws on anything it can't faithfully translate —
 * EXCEPT inside `and`, where untranslatable conjuncts are dropped (the
 * remaining conjuncts are a safe superset; the local query still applies the
 * full predicate). A dropped conjunct marks `exactness.exact = false`, which
 * disables server-side limit/offset push-down (a limit over a superset would
 * under-fill the local result).
 */
export function toInstantWhere(
  expr: IR.BasicExpression,
  exactness?: { exact: boolean },
): InstantWhere {
  if (expr.type !== "func") throw new Error(`untranslatable root: ${expr.type}`)

  const annotation = matchRelationAnnotation(expr)
  if (annotation) return annotation

  switch (expr.name) {
    case "eq": {
      const [a, b] = expr.args
      // Constant-fold literal comparisons (e.g. lofi's always-true eq(1, 1)).
      if (a?.type === "val" && b?.type === "val") {
        if (a.value === b.value) return {} // TRUE — folded away by and/or
        throw new Error("constant-false where") // empty result: don't push
      }
      const [f, v] = refVal(expr.args)
      return { [f]: v }
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const [f, v] = refVal(expr.args)
      return { [f]: { [`$${expr.name}`]: v } }
    }
    case "like":
    case "ilike": {
      const [f, v] = refVal(expr.args)
      return { [f]: { [`$${expr.name}`]: v } }
    }
    case "in": // runtime name emitted by the inArray() builder
    case "inArray": {
      const [f, v] = refVal(expr.args)
      if (!Array.isArray(v)) throw new Error("inArray expects array value")
      return { [f]: { $in: v } }
    }
    case "isNull":
    case "isUndefined": {
      const [a] = expr.args
      if (!a) throw new Error("expected one arg")
      return { [fieldOf(a)]: { $isNull: true } }
    }
    case "not": {
      const [inner] = expr.args
      if (inner?.type !== "func") throw new Error("untranslatable not()")
      if (inner.name === "eq") {
        const [f, v] = refVal(inner.args)
        return { [f]: { $ne: v } }
      }
      if (inner.name === "isNull" || inner.name === "isUndefined") {
        const [a] = inner.args
        if (!a) throw new Error("expected one arg")
        return { [fieldOf(a)]: { $isNull: false } }
      }
      // not(isMissing): lofi compiles `not: null` ("is present") as
      // not(or(isNull(f), isUndefined(f))).
      if (inner.name === "or") {
        const fields = inner.args.map((a) =>
          a?.type === "func" &&
          (a.name === "isNull" || a.name === "isUndefined") &&
          a.args[0]
            ? fieldOf(a.args[0])
            : null,
        )
        const [f] = fields
        if (f != null && fields.every((x) => x === f))
          return { [f]: { $isNull: false } }
      }
      throw new Error(`untranslatable not(${inner.name})`)
    }
    case "and": {
      const parts: Array<InstantWhere> = []
      for (const arg of expr.args) {
        try {
          const p = toInstantWhere(arg, exactness)
          if (Object.keys(p).length > 0) parts.push(p) // drop folded TRUEs
        } catch (err) {
          // Untranslatable conjunct (e.g. a predicate over a joined alias):
          // drop it — superset-safe — and mark the translation inexact.
          // Callers that didn't opt into partial translation (no exactness
          // tracker, e.g. cursor bounds) keep strict throwing behavior.
          if (!exactness) throw err
          exactness.exact = false
        }
      }
      if (parts.length === 0) return {}
      if (parts.length === 1) return parts[0] as InstantWhere
      // A flat object is already an implicit AND in InstaQL — merge conjuncts
      // with disjoint top-level keys and keep the explicit `and` wrapper only
      // when two conjuncts constrain the same key (e.g. a range over one
      // field, or two `or` groups).
      const keys = parts.flatMap((p) => Object.keys(p))
      if (new Set(keys).size === keys.length)
        return Object.assign({}, ...parts) as InstantWhere
      return { and: parts }
    }
    case "or": {
      const parts = expr.args.map((arg) => toInstantWhere(arg, exactness))
      if (parts.some((p) => Object.keys(p).length === 0)) return {} // TRUE
      // Collapse duplicate branches (e.g. lofi's null-or-missing filter maps
      // isNull and isUndefined to the same $isNull clause).
      const unique = [
        ...new Map(parts.map((p) => [JSON.stringify(p), p])).values(),
      ]
      // Instant's $ne matches missing/null attrs, so a {field: {$ne: v}}
      // branch subsumes {field: {$isNull: true}} on the same field. Lofi's
      // null-safe negation compiles or(not(eq), isNull|isUndefined) for the
      // local engine; server-side the extra arm is redundant — drop it so
      // the pushed query stays minimal.
      const neFields = new Set(
        unique.flatMap((p) => {
          const [f, v] = Object.entries(p)[0] ?? []
          return Object.keys(p).length === 1 &&
            f !== undefined &&
            typeof v === "object" &&
            v !== null &&
            "$ne" in v
            ? [f]
            : []
        }),
      )
      const collapsed = unique.filter((p) => {
        const [f, v] = Object.entries(p)[0] ?? []
        return !(
          Object.keys(p).length === 1 &&
          f !== undefined &&
          neFields.has(f) &&
          typeof v === "object" &&
          v !== null &&
          Object.keys(v).length === 1 &&
          (v as Record<string, unknown>).$isNull === true
        )
      })
      if (collapsed.length === 1) return collapsed[0] as InstantWhere
      return { or: collapsed }
    }
    default:
      throw new Error(`untranslatable func: ${expr.name}`)
  }
}

// ---------------------------------------------------------------------------
// Subset planning: turn LoadSubsetOptions into a server-side Instant query.
// A pushed `limit` is only ever correct when the server's ordering exactly
// matches TanStack's local ordering, so ordering push-down is guarded by the
// schema: single clause, raw field ref, indexed, required (no nulls — so
// compareOptions.nulls can't diverge). Strings push safely because local
// collation is pinned to `lexical` (defaultStringCollation below), matching
// Instant's code-unit server ordering — verified empirically. The only
// residual divergence is astral-plane characters (UTF-16 code units vs
// UTF-8 bytes), which can misplace a row at a window boundary.
// ---------------------------------------------------------------------------

type OrderPlan = { field: string; direction: "asc" | "desc" }

function planOrder(
  entity: { attrs: Record<string, unknown> } | undefined,
  options: LoadSubsetOptions,
): OrderPlan | null {
  const orderBy = options.orderBy
  if (orderBy?.length !== 1) return null
  const clause = orderBy[0]
  if (clause?.expression.type !== "ref") return null
  const path = clause.expression.path
  const field = (path.length > 1 ? path.slice(1) : path).join(".")
  if (field.includes(".")) return null // linked-field ordering: not pushable
  const attr = entity?.attrs[field] as
    | { valueType: string; required: unknown; isIndexed: boolean }
    | undefined
  if (!attr) return null
  const indexed = attr.isIndexed === true
  const required = attr.required === true
  const orderableType =
    attr.valueType === "date" ||
    attr.valueType === "number" ||
    attr.valueType === "boolean" ||
    attr.valueType === "string"
  if (!indexed || !required || !orderableType) return null
  return { field, direction: clause.compareOptions.direction }
}

type SubsetPlan = {
  key: string
  query: Record<string, unknown>
  fullTable: boolean
  dollar: InstantDollar | null
  /** True when the pushed where is a faithful (not superset) translation. */
  exact: boolean
}

function stableStringify(v: unknown): string {
  const stable = (x: unknown): unknown =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.keys(x as object)
            .sort()
            .map((k) => [k, stable((x as Record<string, unknown>)[k])]),
        )
      : x
  return JSON.stringify(stable(v))
}

export function planSubset(
  name: string,
  entity: { attrs: Record<string, unknown> } | undefined,
  options: LoadSubsetOptions,
): SubsetPlan {
  const dollar: InstantDollar = {}
  let whereOk = true
  // exact=false when untranslatable AND-conjuncts were dropped: the pushed
  // where is a SUPERSET, so limit/offset (which count rows) must stay local.
  const exactness = { exact: true }

  if (options.where) {
    try {
      const w = toInstantWhere(options.where, exactness)
      if (Object.keys(w).length > 0) dollar.where = w
      // {} = where folded to TRUE: no server filter needed, still pushable
    } catch {
      whereOk = false // superset of the whole table; nothing else is pushable
    }
  }

  const order = whereOk ? planOrder(entity, options) : null
  if (order) dollar.order = { [order.field]: order.direction }

  // Cursor push-down: whereFrom/whereCurrent are ordinary IR expressions over
  // the ordered field(s). or(whereFrom, whereCurrent) is a boundary-inclusive
  // superset of "rows after the cursor", so it is always safe to AND in.
  let cursorOk = false
  if (order && options.cursor) {
    try {
      const from = toInstantWhere(options.cursor.whereFrom)
      const current = toInstantWhere(options.cursor.whereCurrent)
      const combined: InstantWhere = { or: [from, current] }
      dollar.where = dollar.where ? { and: [dollar.where, combined] } : combined
      cursorOk = true
    } catch {
      // untranslatable cursor: fall back to offset or unlimited
    }
  }

  if (
    order &&
    exactness.exact &&
    !cursorOk &&
    typeof options.offset === "number"
  ) {
    dollar.offset = options.offset
  }

  // limit is safe when the pushed where is EXACT and (a) ordering is pushed
  // with verified-matching semantics, or (b) the local query has no orderBy
  // at all, in which case any `limit` rows satisfying the filter are a
  // correct answer.
  const limitSafe =
    typeof options.limit === "number" &&
    whereOk &&
    exactness.exact &&
    (order !== null || !options.orderBy || options.orderBy.length === 0)
  if (limitSafe) dollar.limit = options.limit

  const hasDollar =
    dollar.where !== undefined ||
    dollar.order !== undefined ||
    dollar.limit !== undefined ||
    dollar.offset !== undefined

  const query = hasDollar ? { [name]: { $: dollar } } : { [name]: {} }
  return {
    key: stableStringify(hasDollar ? dollar : "__full__"),
    query,
    fullTable:
      !hasDollar || (dollar.where === undefined && dollar.limit === undefined),
    dollar: hasDollar ? dollar : null,
    exact: whereOk && exactness.exact,
  }
}

// ---------------------------------------------------------------------------
// Link columns
// ---------------------------------------------------------------------------

/**
 * Write-through link columns: every schema link contributes one optional
 * column to each entity it touches, named by that side's LABEL — the same
 * key `.link()` takes (`userSeeks` gets `user`/`seek`; `$users` gets
 * `userSeeks`). The insert/update handlers strip these from the attr payload
 * and translate them to `tx[...].link({ label: id })`; a has-many side also
 * accepts an array of ids. WRITE-ONLY: Instant stores links as triples, not
 * attrs, so reads never return these columns — they exist only on the
 * collection's INSERT/UPDATE input type (TInsertInput), never on the read
 * row, keeping query result types honest and include labels collision-free.
 *
 * Derived from the per-entity link map (EntitiesWithLinks) rather than
 * schema.links — i.schema erases the top-level links type to LinksDef<any>,
 * but merges a `{ [label]: { entityName, cardinality } }` map into each
 * entity def, which is exactly the shape needed here.
 */
type LinkColumns<
  TSchema extends AnyInstantSchema,
  K extends keyof TSchema["entities"],
> = {
  [L in keyof TSchema["entities"][K]["links"]]?: TSchema["entities"][K]["links"][L] extends {
    cardinality: "one"
  }
    ? string
    : string | ReadonlyArray<string>
}

type LinkSide = { on: string; label: string }

/**
 * A collection whose READ type is the plain entity row and whose WRITE
 * (insert/update input) type additionally accepts the link columns. Built by
 * inference so the middle type params keep Collection's defaults without
 * naming StandardSchemaV1 (which @tanstack/db does not re-export).
 */
type EntityCollection<Row extends object, Write extends object> =
  Collection<Row> extends Collection<
    infer T,
    infer TKey,
    infer TUtils,
    infer TSchema,
    infer _TInsert
  >
    ? Collection<T, TKey, TUtils, TSchema, T & Write>
    : never

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Fields of a row whose (non-null) value type is assignable to V. */
type FieldsOfType<Row, V> = {
  [F in keyof Row]-?: NonNullable<Row[F]> extends V ? F : never
}[keyof Row] &
  string

/**
 * Valid auto-link source fields for a label: a has-one link mirrors a single
 * id (string attrs only); a has-many link accepts an id or an array of ids.
 */
type AutoLinkSource<
  TSchema extends AnyInstantSchema,
  K extends keyof TSchema["entities"],
  L extends keyof TSchema["entities"][K]["links"],
> = TSchema["entities"][K]["links"][L] extends { cardinality: "one" }
  ? FieldsOfType<InstaQLEntity<TSchema, K>, string>
  : FieldsOfType<InstaQLEntity<TSchema, K>, string | ReadonlyArray<string>>

/**
 * How eagerly a collection serves LOCAL rows for a subset that hasn't heard
 * from the server yet (the wire always opens; the server's snapshot always
 * reconciles):
 * - "proven":   only when local data is provably the COMPLETE answer — the
 *               where carries a unique-field equality/$in and every bounded
 *               row is local. Never wrong, may still spin on broader queries.
 * - "matching": "proven", plus serve when at least one local row MATCHES the
 *               predicate (stale-while-revalidate). Never a false empty
 *               state, but lists may append/reshuffle when truth arrives.
 * - "off":      always wait for the server's first snapshot.
 */
export type LocalFirstMode = "proven" | "matching" | "off"

export type CreateCollectionsOptions<
  TSchema extends AnyInstantSchema = AnyInstantSchema,
> = {
  /**
   * Local-first serving policy, global or per entity. `$all` sets the
   * default for entities not listed (reserved name — Instant forbids user
   * namespaces starting with `$`). Defaults to "matching" everywhere.
   *
   *   localFirst: "proven"
   *   localFirst: { $all: "matching", userSeeks: "proven" }
   */
  localFirst?:
    | LocalFirstMode
    | ({ $all?: LocalFirstMode } & {
        [K in keyof TSchema["entities"]]?: LocalFirstMode
      })
  /**
   * Auto-links: per entity, link label -> attr field that mirrors it. A
   * write that sets the field still writes the attr as data, and ALSO emits
   * .link({ label: value }) — so FK-mirror attrs like userSeeks.seekId keep
   * their link in sync without callers passing link columns:
   *
   *   { links: { userSeeks: { seek: "seekId", user: "userId" } } }
   *
   * An explicit link column in the same write wins over the auto-link. Null
   * source values are skipped — unlink still requires db.transact.
   */
  links?: {
    [K in keyof TSchema["entities"]]?: {
      [L in keyof TSchema["entities"][K]["links"]]?: AutoLinkSource<
        TSchema,
        K,
        L
      >
    }
  }
  /**
   * Entities that must NEVER silently subscribe to their full namespace.
   * For a strict entity, a subset whose predicates can't be pushed into a
   * server-side filter throws (loudly, at query time) instead of warning and
   * syncing the whole table, and a server-rejected pushed query does NOT
   * fall back to an unfiltered subscription. Use for large/public tables
   * where a full sync is never acceptable.
   *
   * Boolean = global; object = per entity with `$all` fallback (reserved
   * name — Instant forbids user namespaces starting with `$`). Defaults to
   * false everywhere.
   *
   *   strictSubsets: true
   *   strictSubsets: { $all: true, seeks: false }
   */
  strictSubsets?:
    | boolean
    | ({ $all?: boolean } & {
        [K in keyof TSchema["entities"]]?: boolean
      })
  /**
   * Log local-first serving decisions ("subset served from local
   * (unique-bound|overlap-swr)") to the console. Off by default — useful
   * when debugging why a page rendered instantly (or didn't).
   */
  verbose?: boolean
  /**
   * How long an unreferenced subset keeps its Instant subscription OPEN
   * before going dormant. Rows are NEVER evicted by lifecycle — a dormant
   * subset keeps its data locally and reconciles it against the first fresh
   * snapshot when re-acquired (stale-while-revalidate). Only server-observed
   * deletes and collection cleanup remove rows.
   *
   * Default 5s: covers back-button regret and quick tab-flips (the bulk of
   * returns happen within seconds) so the hot working set stays wired, while
   * anything idle longer drops to dormant SWR — rows retained locally,
   * revalidated on return. Lower it toward 1ms for instant unsubscribe
   * visibility in dev; raise it (or pass Infinity) to keep wires warm longer
   * at the cost of more standing server queries.
   */
  subsetGraceMs?: number
}

export function createCollections<
  TSchema extends AnyInstantSchema,
  TUseDates extends boolean = false,
>(
  db: InstantReactWebDatabase<TSchema, TUseDates>,
  schema: TSchema,
  options?: CreateCollectionsOptions<TSchema>,
) {
  const subsetGraceMs = options?.subsetGraceMs ?? 5_000
  const verbose = options?.verbose === true
  // `subscribeQuery<Q extends ValidQuery<Q, Schema>>` has the same
  // self-referential constraint as queryOnce — unsatisfiable while TSchema is
  // an unresolved generic — so we go through ValidQuery's
  // InstantUnknownSchema branch. The React class exposes the core db (which
  // owns subscribeQuery) as the public `core` property.
  const looseDb = db as unknown as InstantReactWebDatabase<InstantUnknownSchema>
  const core = looseDb.core

  const collections = Object.fromEntries(
    Object.keys(schema.entities).map((name) => {
      // Link columns for this entity (see LinkColumns above). A label that
      // collides with a real attr would shadow data writes, so it's skipped.
      const entityAttrs =
        (
          schema.entities[name] as
            | { attrs?: Record<string, unknown> }
            | undefined
        )?.attrs ?? {}
      const localFirst = resolveLocalFirst(
        options?.localFirst as Parameters<typeof resolveLocalFirst>[0],
        name,
      )
      const strict = resolveStrict(
        options?.strictSubsets as Parameters<typeof resolveStrict>[0],
        name,
      )

      // Unique-equality fields for the point-lookup fast path below: `id`
      // (implicit pk) plus every unique-indexed attr. A single-field equality
      // on one of these is the one predicate local data can prove COMPLETE
      // for: if a matching row is already local, no other match can exist.
      const uniqueFields = new Set<string>(["id"])
      for (const [field, attr] of Object.entries(entityAttrs)) {
        if ((attr as { config?: { unique?: boolean } }).config?.unique)
          uniqueFields.add(field)
      }

      const linkLabels = new Set<string>()
      for (const link of Object.values(
        schema.links as Record<
          string,
          { forward: LinkSide; reverse: LinkSide }
        >,
      )) {
        for (const side of [link.forward, link.reverse]) {
          if (side.on !== name) continue
          if (side.label in entityAttrs) {
            console.warn(
              `[instant:${name}] link label "${side.label}" collides with ` +
                `an attr; not exposed as a link column`,
            )
            continue
          }
          linkLabels.add(side.label)
        }
      }

      // Auto-links (options.links): label -> source attr field; a write that
      // sets the field also links its label to the field's value.
      const autoLinks = Object.entries(
        (
          options?.links as
            | Record<string, Record<string, string | undefined> | undefined>
            | undefined
        )?.[name] ?? {},
      ).filter((e): e is [string, string] => typeof e[1] === "string")

      /** Split a write payload into attr fields and .link() args. */
      const splitLinks = (fields: Record<string, unknown>) => {
        const attrs: Record<string, unknown> = {}
        let links: Record<string, string | Array<string>> | null = null
        for (const [k, v] of Object.entries(fields)) {
          if (!linkLabels.has(k)) {
            attrs[k] = v
          } else if (v != null) {
            links ??= {}
            links[k] = v as string | Array<string>
          }
          // null/undefined link column: dropped — unlink() needs the linked
          // id, which reads never materialize. Unlink via db.transact.
        }
        for (const [label, field] of autoLinks) {
          const v = attrs[field]
          if (v == null) continue // attr not in this write (or null): no link
          if (links?.[label] !== undefined) continue // explicit column wins
          links ??= {}
          links[label] = v as string | Array<string>
        }
        return { attrs, links }
      }

      const collection = createCollection<Row>({
        id: `instant:${name}`,
        getKey: (item) => item.id,
        // Advertises the fields this entity accepts on writes (id + attrs +
        // link columns) so lofi's `$all`-scoped write defaults can skip
        // entities that don't have a given field.
        utils: {
          writableFields: new Set([
            "id",
            ...Object.keys(entityAttrs),
            ...linkLabels,
          ]),
        },
        // InstantDB orders strings by raw code units (C collation) — verified
        // empirically against the live backend (probe: server order matched
        // JS `a < b` exactly and did NOT match localeCompare). TanStack's
        // default is locale-aware sorting, which disagrees on case grouping,
        // accents, and punctuation — locally-sorted rows would diverge from
        // server-pushed windows. Pin every collection to lexical so local
        // order === server order. (Residual gap: JS compares UTF-16 code
        // units, C collation compares UTF-8 bytes — they differ only for
        // astral-plane characters, e.g. emoji, vs U+E000–U+FFFF.)
        defaultStringCollation: { stringSort: "lexical" },
        // Auto-indexing: index matching (matchesCompareOptions) deep-equals
        // the orderBy clause's compare options — including `nulls` — against
        // the index's. Manually created indexes get DEFAULT_COMPARE_OPTIONS
        // (nulls: 'first'), so any orderBy with nulls: 'last' (lofi's
        // user-facing default) would miss them and fall back to loading all
        // data. With autoIndex: 'eager', ensureIndexForField auto-creates a
        // BTree index with the clause's exact compare options at query
        // compile time, so orderBy+limit lazy loading always has an index.
        autoIndex: "eager",
        defaultIndexType: BTreeIndex,
        // On-demand: nothing syncs until a live query actually needs data;
        // TanStack then calls loadSubset with the query's predicates.
        syncMode: "on-demand",
        // Persistence: TanStack DB applies writes optimistically, then awaits
        // these handlers; a rejection rolls the optimistic write back. Link
        // columns split off into a chained .link(). STRICT ops on purpose:
        // with on-demand sync the local collection may lack rows that exist
        // on the server, so TanStack's local insert/update guards aren't
        // enough — create() fails on an existing row instead of silently
        // upserting over it, and { upsert: false } fails on a missing row
        // instead of ghost-creating a partial one. The open subscription
        // delivers the authoritative row back and reconciles.
        onInsert: async ({ transaction }) => {
          await core.transact(
            transaction.mutations.map(({ key, modified }) => {
              const { id: _id, ...fields } = modified
              const { attrs, links } = splitLinks(fields)
              // CreateParams degenerates under the unknown schema (attrs are
              // `any`); real payload safety lives in the wrappers' generics.
              const chunk = core.tx[name]?.[String(key)]?.create(
                attrs as CreateParams<InstantUnknownSchema, string>,
              )
              return links ? chunk?.link(links) : chunk
            }),
          )
        },
        onUpdate: async ({ transaction }) => {
          await core.transact(
            transaction.mutations.map(({ key, changes }) => {
              const { id: _id, ...fields } = changes as Row
              const { attrs, links } = splitLinks(fields)
              const chunk = core.tx[name]?.[String(key)]?.update(attrs, {
                upsert: false,
              })
              return links ? chunk?.link(links) : chunk
            }),
          )
        },
        onDelete: async ({ transaction }) => {
          await core.transact(
            transaction.mutations.map(({ key }) =>
              core.tx[name]?.[String(key)]?.delete(),
            ),
          )
        },
        sync: {
          rowUpdateMode: "full",
          sync: ({ collection, begin, write, commit, markReady }) => {
            type Sub = {
              refCount: number
              unsubscribe: () => void
              ready: boolean
              readyPromise: Promise<void>
              rows: Map<string, string> // id -> serialized
              query: Record<string, unknown> // for unsubscribe logging
              gcTimer: ReturnType<typeof setTimeout> | null
              live: boolean // wire open? rows persist regardless
              dollar: InstantDollar | null // pushed query shape, for coverage
              /**
               * A WINDOWED sub whose last snapshot came back SMALLER than its
               * limit: the server has no more rows for its where/order —
               * cursor top-ups beyond this window can be answered locally.
               */
              exhausted: boolean
            }
            const subs = new Map<string, Sub>()
            // request-key -> stack of covering sub-keys, so unloadSubset
            // releases the sub that actually served each covered load
            const coveredBy = new Map<string, Array<string>>()
            // id -> set of subset keys that currently include the row; a row
            // is deleted from the collection only when no subset owns it.
            const owners = new Map<string, Set<string>>()
            const entity = schema.entities[name] as
              | { attrs: Record<string, unknown> }
              | undefined

            const hasLiveOwner = (ownedBy: Set<string>): boolean => {
              for (const k of ownedBy) if (subs.get(k)?.live) return true
              return false
            }

            const applySnapshot = (key: string, sub: Sub, rows: Array<Row>) => {
              sub.exhausted =
                sub.dollar?.limit !== undefined &&
                rows.length < sub.dollar.limit
              const seen = new Set<string>()
              begin()
              for (const row of rows) {
                seen.add(row.id)
                const serialized = JSON.stringify(row)
                const ownedBy = owners.get(row.id) ?? new Set<string>()
                ownedBy.add(key)
                owners.set(row.id, ownedBy)
                if (!collection.has(row.id)) {
                  write({ type: "insert", value: row })
                } else if (sub.rows.get(row.id) !== serialized) {
                  write({ type: "update", value: row })
                }
                sub.rows.set(row.id, serialized)
              }
              for (const id of sub.rows.keys()) {
                if (seen.has(id)) continue
                sub.rows.delete(id)
                const ownedBy = owners.get(id)
                ownedBy?.delete(key)
                // Fresh evidence outranks dormant claims: this LIVE snapshot
                // says the row is gone from its subset; if no other LIVE
                // subset still contains it, drop it. A dormant subset that
                // legitimately covers it will re-fetch it on revalidation.
                if (!ownedBy || ownedBy.size === 0 || !hasLiveOwner(ownedBy)) {
                  owners.delete(id)
                  if (collection.has(id)) write({ type: "delete", key: id })
                }
              }
              commit()
            }

            const connect = (sub: Sub, plan: SubsetPlan): void => {
              // The only place we hit InstantDB: one log per subscribeQuery.
              console.log(
                `[instant:${name}] subscribeQuery`,
                JSON.stringify(sub.query),
              )
              if (plan.fullTable) {
                console.warn(
                  `[instant:${name}] subset not fully pushable; ` +
                    `subscribing without a server-side filter`,
                  plan.query,
                )
              }
              sub.live = true
              sub.readyPromise = new Promise<void>((resolve) => {
                type Resp = Parameters<
                  Parameters<typeof core.subscribeQuery>[1]
                >[0]

                // Instant delivers cached results SYNCHRONOUSLY inside
                // subscribeQuery(), and loadSubset can run during a React
                // render (useLiveQuery creates collections while rendering) —
                // committing then would notify OTHER subscribed components
                // mid-render ("Cannot update a component while rendering a
                // different component"). A microtask moves every delivery off
                // the render stack; the guard drops deliveries for subs
                // released or cleaned up in the meantime.
                const deliver = (resp: Resp, fn: (resp: Resp) => void) => {
                  queueMicrotask(() => {
                    if (subs.get(plan.key) !== sub || !sub.live) return
                    fn(resp)
                  })
                }

                const handleFallback = (resp: Resp) => {
                  if (resp.error || !resp.data) return
                  applySnapshot(plan.key, sub, resp.data[name] ?? [])
                  if (!sub.ready) {
                    sub.ready = true
                    resolve()
                  }
                }

                const handle = (resp: Resp) => {
                  if (resp.error) {
                    console.error(
                      `[instant:${name}] subscription error`,
                      resp.error,
                    )
                    if (!sub.ready && plan.query[name] !== undefined) {
                      const dollar = (plan.query[name] as { $?: InstantDollar })
                        .$
                      if (dollar && strict) {
                        // Strict entity: the server rejected the pushed query,
                        // and the unfiltered fallback would sync the whole
                        // namespace. Fail loudly; the subset stays empty.
                        console.error(
                          `[instant:${name}] pushed query rejected; ` +
                            `strictSubsets forbids the unfiltered fallback`,
                          JSON.stringify(plan.query),
                        )
                      } else if (dollar) {
                        // Pushed-down query rejected by the server (e.g. a
                        // field the server considers non-indexed): degrade
                        // to the unfiltered subscription. Superset is safe;
                        // TanStack re-filters/sorts/limits locally.
                        const fallbackQuery = { [name]: {} }
                        console.log(
                          `[instant:${name}] unsubscribeQuery (rejected)`,
                          JSON.stringify(plan.query),
                        )
                        console.log(
                          `[instant:${name}] subscribeQuery (fallback)`,
                          JSON.stringify(fallbackQuery),
                        )
                        sub.unsubscribe()
                        sub.query = fallbackQuery
                        sub.unsubscribe = core.subscribeQuery(
                          fallbackQuery as InstaQLParams<InstantUnknownSchema>,
                          (fullResp) => deliver(fullResp, handleFallback),
                        )
                        return
                      }
                    }
                    if (!sub.ready) {
                      sub.ready = true
                      resolve() // unblock; retries are Instant's job
                    }
                    return
                  }
                  if (!resp.data) return
                  applySnapshot(plan.key, sub, resp.data[name] ?? [])
                  if (!sub.ready) {
                    sub.ready = true
                    resolve()
                  }
                }

                sub.unsubscribe = core.subscribeQuery(
                  plan.query as InstaQLParams<InstantUnknownSchema>,
                  (resp) => deliver(resp, handle),
                )
              })
            }

            const subscribe = (plan: SubsetPlan): Sub => {
              const sub: Sub = {
                refCount: 0,
                unsubscribe: () => {},
                ready: false,
                readyPromise: Promise.resolve(),
                rows: new Map(),
                query: plan.query,
                gcTimer: null,
                live: false,
                dollar: plan.dollar,
                exhausted: false,
              }
              connect(sub, plan)
              subs.set(plan.key, sub)
              return sub
            }

            // Subsumption (Electric-style, adapted to our lifecycle): a LIVE
            // unlimited sub covers any request over the same (or absent)
            // where — its open wire doubles as the revalidator, so covered
            // answers are never stale-without-revalidation. Dormant subs
            // never cover: coverage without a wire would break SWR.
            const findCovering = (plan: SubsetPlan): string | null => {
              const wantWhere = plan.dollar?.where
              const wantKey = stableStringify(wantWhere ?? null)
              let fullKey: string | null = null
              for (const [key, sub] of subs) {
                if (!sub.live || !sub.ready) continue
                const d = sub.dollar
                if (d?.limit !== undefined || d?.offset !== undefined) continue
                const haveWhere = d?.where
                if (haveWhere === undefined) fullKey = key
                if (stableStringify(haveWhere ?? null) === wantKey) return key
              }
              return fullKey
            }

            // On-demand collections are "ready" immediately; data readiness
            // is per-subset via the loadSubset promise.
            markReady()

            return {
              loadSubset: (options: LoadSubsetOptions) => {
                const plan = planSubset(name, entity, options)
                if (plan.fullTable && strict) {
                  // Fail soft: no wire opens (the point of strict), the query
                  // renders from whatever local rows exist (possibly none),
                  // and the reason lands in the console. TanStack gives
                  // loadSubset no channel to flip a live query into `error` —
                  // a rejected promise settles back to ready — so a loud log
                  // + local-only data is the strongest non-crashing signal.
                  console.error(
                    `[instant:${name}] subset is not pushable to a ` +
                      `server-side filter and "${name}" is strict — refusing ` +
                      `to subscribe to the full namespace; serving LOCAL ` +
                      `DATA ONLY. Add a pushable where/orderBy or relax ` +
                      `strictSubsets for this entity. Requested: ${JSON.stringify(plan.query)}`,
                  )
                  return true
                }

                // Cursor top-up interception: TanStack's orderBy+limit lazy
                // loader asks for rows BEYOND a window boundary whenever a
                // subset reports ready with fewer rows than the window (a
                // dormant re-acquire, or a partial overlap-SWR serve below).
                // Two local answers, no new wire:
                // - a parent window sub (same main where, same order) marked
                //   EXHAUSTED proves nothing exists beyond the boundary
                //   server-side;
                // - a parent window sub still IN FLIGHT already covers the
                //   rows this top-up wants — answer ready now (the pending
                //   snapshot will stream the rows in and the window fills
                //   incrementally) instead of opening a second, overlapping
                //   subscription. Returning the parent's promise instead
                //   would defeat overlap SWR: readiness would block on the
                //   very fetch the local serve was meant to hide.
                if (options.cursor) {
                  const parent = planSubset(name, entity, {
                    where: options.where,
                    orderBy: options.orderBy,
                  } as LoadSubsetOptions)
                  const wantWhere = stableStringify(
                    parent.dollar?.where ?? null,
                  )
                  const wantOrder = stableStringify(
                    parent.dollar?.order ?? null,
                  )
                  let pending: Sub | null = null
                  for (const sub of subs.values()) {
                    const d = sub.dollar
                    if (!d || d.limit === undefined) continue
                    if (stableStringify(d.where ?? null) !== wantWhere) continue
                    if (stableStringify(d.order ?? null) !== wantOrder) continue
                    if (sub.exhausted) {
                      if (verbose) {
                        console.log(
                          `[instant:${name}] cursor top-up answered from local — parent window exhausted`,
                          JSON.stringify(plan.query),
                        )
                      }
                      return true
                    }
                    if (sub.live && !sub.ready) pending = sub
                  }
                  if (pending) {
                    if (verbose) {
                      console.log(
                        `[instant:${name}] cursor top-up answered from local — parent window in flight`,
                        JSON.stringify(pending.query),
                      )
                    }
                    return true
                  }
                }

                // Unique-bound fast path (SWR): when the where contains a
                // top-level unique-field equality (or $in batch — the shape
                // join loaders emit for key-loads) and EVERY bounded value
                // already has a local row, the candidate set is fully local
                // — the whole query (other conjuncts, order, limit) is
                // locally decidable, so report ready immediately. The
                // subscription still opens below and reconciles/live-updates
                // in the background.
                const servedByLocalUnique = (() => {
                  if (localFirst === "off") return false
                  if (!options.where) return false
                  const bound = uniqueBoundOf(options.where, uniqueFields)
                  if (!bound) return false
                  if (bound.field === "id") {
                    return bound.values.every((v) =>
                      collection.has(v as string),
                    )
                  }
                  const missing = new Set(bound.values)
                  for (const row of collection.values()) {
                    missing.delete((row as Row)[bound.field])
                    if (missing.size === 0) return true
                  }
                  return false
                })()

                // Overlap SWR: even without a completeness proof, serve
                // local data immediately when local rows MATCH the predicate
                // — the page shows what we have while the subscription below
                // fetches the truth and reconciles. One guard: at least one
                // matching row must land in the VISIBLE window (more matches
                // than the offset skips) — serving fewer would render a false
                // empty state. A partially-filled window (limit) is fine: the
                // lazy loader's cursor top-up for the remainder parks on the
                // in-flight window subscription (see the interception above)
                // instead of opening a second wire.
                const servedByLocalOverlap =
                  localFirst === "matching" &&
                  !servedByLocalUnique &&
                  (() => {
                    const needed = (options.offset ?? 0) + 1
                    let count = 0
                    for (const row of collection.values()) {
                      if (
                        !options.where ||
                        evalLocalWhere(options.where, row as Row) === true
                      ) {
                        count++
                        if (count >= needed) return true
                      }
                    }
                    return false
                  })()

                const servedByLocal =
                  servedByLocalUnique || servedByLocalOverlap

                let sub = subs.get(plan.key)
                if (!sub) {
                  const coveringKey = findCovering(plan)
                  if (coveringKey !== null) {
                    // Served entirely by an existing live superset: zero
                    // Instant traffic. Pair the eventual unload to it.
                    const covering = subs.get(coveringKey)
                    if (covering) {
                      const stack = coveredBy.get(plan.key) ?? []
                      stack.push(coveringKey)
                      coveredBy.set(plan.key, stack)
                      covering.refCount++
                      return true
                    }
                  }
                  sub = subscribe(plan)
                }
                if (sub.gcTimer !== null) {
                  // re-acquired within the grace window: keep the live
                  // subscription and its rows — no Instant hit needed
                  clearTimeout(sub.gcTimer)
                  sub.gcTimer = null
                }
                if (!sub.live) {
                  // dormant re-acquire: rows were retained; reopen the wire.
                  // Serve local data immediately (stale-while-revalidate) —
                  // the first fresh snapshot diffs against the retained rows
                  // and corrects anything that changed while dormant.
                  connect(sub, plan)
                }
                sub.refCount++
                if (sub.ready) return true
                if (servedByLocal) {
                  // Serve local rows now (unique bound = provably complete;
                  // overlap = stale-while-revalidate); the subscription
                  // above reconciles and live-updates in the background.
                  if (verbose) {
                    console.log(
                      `[instant:${name}] subset served from local (${
                        servedByLocalUnique ? "unique-bound" : "overlap-swr"
                      }); revalidating`,
                      JSON.stringify(sub.query),
                    )
                  }
                  return true
                }
                return sub.readyPromise.then(() => {})
              },
              unloadSubset: (options: LoadSubsetOptions) => {
                const plan = planSubset(name, entity, options)
                const aliasStack = coveredBy.get(plan.key)
                const targetKey = aliasStack?.pop() ?? plan.key
                if (aliasStack && aliasStack.length === 0)
                  coveredBy.delete(plan.key)
                const sub = subs.get(targetKey)
                if (!sub) return
                sub.refCount--
                if (sub.refCount > 0) return
                // Infinite grace: never release wires.
                if (subsetGraceMs === Number.POSITIVE_INFINITY) return
                // Grace expiry releases the WIRE only: rows stay local and
                // stay owned; the subset goes dormant and revalidates on
                // re-acquire. Rows leave only via server deletes or cleanup.
                sub.gcTimer = setTimeout(() => {
                  sub.gcTimer = null
                  if (sub.refCount > 0) return // re-acquired concurrently
                  console.log(
                    `[instant:${name}] unsubscribeQuery`,
                    JSON.stringify(sub.query),
                  )
                  sub.unsubscribe()
                  sub.unsubscribe = () => {}
                  sub.live = false
                }, subsetGraceMs)
              },
              cleanup: () => {
                for (const sub of subs.values()) {
                  if (sub.gcTimer !== null) clearTimeout(sub.gcTimer)
                  console.log(
                    `[instant:${name}] unsubscribeQuery (cleanup)`,
                    JSON.stringify(sub.query),
                  )
                  sub.unsubscribe()
                }
                subs.clear()
                coveredBy.clear()
                owners.clear()
              },
            }
          },
        },
      })

      // Mirror the schema's server-side indexes locally so TanStack's
      // live-query planner can use them for where/order without full scans.
      // unique() fields are included (lookup-indexed on the server); json is
      // excluded (no total order). BTree for range (gt/lt) and order support.
      // These manual indexes carry DEFAULT_COMPARE_OPTIONS (nulls: 'first');
      // orderBy clauses with other compare options are handled by the
      // autoIndex: 'eager' config above, which creates a matching index on
      // demand instead of falling back to a full load.
      const attrs = (
        schema.entities[name] as
          | {
              attrs: Record<
                string,
                {
                  valueType: string
                  config: { indexed: boolean; unique: boolean }
                }
              >
            }
          | undefined
      )?.attrs
      // Manual indexes must carry the EXACT compare options the query
      // optimizer looks up: findIndexForField matches indexes against
      // TanStack's defaults merged with the collection's collation
      // (deep-equality, direction ignored). Passing nothing would leave the
      // index on stringSort: "locale" while the lookup expects "lexical"
      // (defaultStringCollation above) — and the autoIndex fallback DROPS
      // its computed compareOptions when creating join indexes (upstream
      // bug: `options: compareFn ? {...} : {}`), so a mismatch here makes
      // lazy joins warn "requires an index" and load the WHOLE joined table.
      const indexCompareOptions = {
        // TanStack's DEFAULT_COMPARE_OPTIONS (not exported — mirrored here;
        // a drift upstream degrades loudly via the join warning, not wrong
        // results)…
        direction: "asc" as const,
        nulls: "first" as const,
        stringSort: "locale" as const,
        // …overridden by the collection collation (lexical).
        ...collection.compareOptions,
      }

      // `id` is implicit in Instant schemas (never present in attrs), but
      // TanStack's join loader requires an id index to load joined rows by
      // key instead of falling back to the whole table.
      collection.createIndex((row) => row.id, {
        indexType: BTreeIndex,
        name: "id",
        options: { compareOptions: indexCompareOptions },
      })
      for (const [field, attr] of Object.entries(attrs ?? {})) {
        if (attr.valueType === "json") continue
        if (!attr.config.indexed && !attr.config.unique) continue
        collection.createIndex((row) => row[field], {
          indexType: BTreeIndex,
          name: field,
          options: { compareOptions: indexCompareOptions },
        })
      }

      return [name, collection]
    }),
  )

  // Object.fromEntries collapses to an index signature and `name` is the key
  // union inside the loop — the per-key mapping below is expressible only as
  // a mapped type, so it must be asserted.
  return collections as unknown as {
    [K in keyof TSchema["entities"]]: EntityCollection<
      InstaQLEntity<TSchema, K, Record<never, never>, undefined, TUseDates>,
      LinkColumns<TSchema, K>
    >
  }
}
