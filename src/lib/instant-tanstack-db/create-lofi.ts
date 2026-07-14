/**
 * create-lofi.ts — @tanstack-db-lofi/react
 *
 * lofi: Prisma-style entities for TanStack DB. Local-first, fully typed,
 * live everywhere.
 *
 *   export const lofi = createLofi(collections)
 *
 *   // by unique key (data: Row | undefined; null/undefined key = no match)
 *   const { data: user } = lofi.useFindUnique("users", userId)
 *
 *   // first match of a filter
 *   const { data: pet } = lofi.useFindFirst("pets", {
 *     where: { owner: { name: { startsWith: "A" } } },
 *     include: { users: { as: "owner", on: "userId" } },
 *   })
 *
 *   // many
 *   const { data: pets } = lofi.useFindMany("pets", {
 *     where: { age: { gt: 2 }, owner: { age: { gt: 30 } } },
 *     include: { users: { as: "owner", on: "userId" } },
 *     orderBy: { owner: { name: { sort: "asc", nulls: "last" } } },
 *     take: 10,
 *   })
 *
 *   // mutations — typed wrappers over the collection write API
 *   lofi.insertItem("pets", { id, name: "Rex", userId })
 *   lofi.updateItem("pets", id, { name: "Fido" })      // or (draft) => { ... }
 *   lofi.deleteItem("pets", id)                        // or [id1, id2]
 *
 *   // Sync-layer link columns (write-only, named by link label) persist
 *   // under the hood — see LinkColumns in create-collections.ts:
 *   lofi.updateItem("userSeeks", id, { user: userId, seek: seekId })
 *
 *   // Write defaults (see CreateLofiOptions): timestamps etc. managed for
 *   // you — insert-defaulted fields become optional in insertItem payloads.
 *   createLofi(collections, {
 *     mutationDefaults: {
 *       insert: { $all: { createdAt: () => new Date() } },
 *       update: { $all: { updatedAt: () => new Date() } },
 *     },
 *   })
 *
 * RELATIONS — one mechanism: `include`, keyed by TABLE name (Prisma-style).
 *   Each entry declares a relation once per query; `where`, `orderBy`, and
 *   `distinct` may then reference it by its OUTPUT name — `as`, defaulting to
 *   the table name. There is no `join` clause; the compiler synthesizes hidden
 *   joins when a relation is referenced upstream (filtering / sorting) and
 *   correlated subqueries for the nested output.
 *
 *   include: {
 *     users: {                // key = target collection (completes from the schema)
 *       as: 'owner',          // output field name; defaults to the key ('users')
 *       on: 'userId',         // string shorthand follows the FK:
 *                             //   to-one: parent.userId = target.<pk>
 *                             //   many:   target.userId = parent.<pk>
 *                             // (so users -> pets is just on: 'userId' too)
 *       // on: { id: 'userId' }  object form: parentField -> targetField, either cardinality
 *       required: true,       // parent row must have a match (drops row + narrows type)
 *       emit: false,          // declare for filtering only; not in output/type
 *       many: true,           // nested array instead of object|null
 *       where: {...},         // filters the NESTED data (not the parents)
 *       orderBy: {...}, take: 3, skip: 3,   // per-parent child options (many only)
 *       select: ['name'],     // project child fields
 *       distinct: 'species',  // many only: unique combos per parent (see note)
 *       include: {...},       // nested relations, arbitrary depth
 *     },
 *   }
 *
 *   A table appears at most ONCE per include block (keys are unique); `as`
 *   renames the output field, it does not fan out multiple relations onto the
 *   same target table.
 *
 * SEMANTICS
 *   - useFindUnique(model, key, args?) looks up by primary key ('id' by
 *     default, configurable via options.primaryKeys). A null/undefined key is
 *     the loading-parent pattern: the hook stays mounted and returns no data.
 *   - useFindFirst(model, args) returns the first match (respects
 *     where/orderBy).
 *   - GATING: pass exactly `false` as the args (or the key) to disable a
 *     query — the idiom is useFindMany("todos", !!user && { where: ... }).
 *     null/undefined args still mean "no filters, fetch all"; only `false`
 *     (and `enabled: false` inside args) skips. A skipped query returns
 *     data: placeholderData ?? undefined — never [] — so "didn't ask" stays
 *     distinguishable from "asked, zero matches".
 *   - placeholderData (SSR/hydration): shown until the live query is ready,
 *     and while disabled. Display-only fallback — never written to the
 *     collection (TanStack Query's placeholderData, not initialData). Typed
 *     as the exact result shape (arrays for useFindMany, a single row for
 *     useFindFirst/useFindUnique). Excluded from query identity; changing it
 *     never recompiles or resubscribes.
 *   - STATUS while a placeholder is shown follows TanStack Query: the hook
 *     reports success (isLoading false, isReady true, status "ready") with
 *     isPlaceholderData: true — the live query's pending state is a
 *     background revalidation, not a loading screen. Errors are never
 *     masked: an errored query keeps isError even if a placeholder renders.
 *   - Top-level `where` referencing a label FILTERS THE PARENTS.
 *     · to-one:  { owner: { age: { gt: 30 } } }  — body of scalar filters;
 *                unmatched parents are dropped (Prisma `is` semantics).
 *                { owner: null } matches parents with NO related row.
 *     · to-many: must use { some | every | none }: bare bodies are an error.
 *                { pets: { some: { vaccinated: true } } }
 *                Compiled as semi/anti-joins (deduplicated); `every` is
 *                vacuously true for parents with zero children (SQL/Prisma).
 *     · Relation predicates compose under AND/OR/NOT with scalar filters.
 *   - `required: true` cascades upward: a required include deep in the tree
 *     requires the whole path to exist (kills its parent, which kills the row).
 *   - `where` INSIDE an include only filters the nested data. On a to-one
 *     include, a non-matching relation renders as null (parent row kept).
 *   - orderBy values: 'asc' | 'desc' | { sort, nulls: 'first' | 'last' }.
 *     Default nulls: 'last' for BOTH directions (UI-friendly; SQL defaults
 *     differ on desc). Sorting through labels requires to-one; unmatched rows
 *     order per `nulls`.
 *   - `select: ['field', ...]` projects scalar fields; composes with include
 *     (unlike Prisma there is no select/include exclusivity).
 *   - Top-level `distinct: ['field', { label: 'field' }]` is Prisma-style:
 *     the FIRST full row per unique field combination under the query's
 *     `orderBy` (rows keep their include output). Dedup runs in a memoized
 *     post-transform over the engine result; `take`/`skip` apply engine-side
 *     BEFORE dedup (Prisma's documented behavior — a page can yield fewer
 *     than `take` rows). Excludes `select`; relation entries require a
 *     declared, EMITTED to-one include (the dedup key reads the nested
 *     output).
 *   - Per-include `distinct` (many only): deduplication runs client-side in a
 *     memoized post-transform — TanStack's distinct() is currently broken
 *     inside correlated include subqueries (dedupes globally across parents).
 *     Everything else compiles to the engine.
 *   - take/skip require an ordering in TanStack DB; when omitted we auto-order
 *     by the primary key (with nulls: 'first' — PKs are never null, and
 *     'first' matches the DEFAULT_COMPARE_OPTIONS of plainly-created indexes,
 *     so the orderBy+limit lazy-loading optimization can find the pk index).
 *   - Composite `on` keys are supported for FETCHING only; relation FILTERS
 *     (label refs in where/orderBy/distinct, required, some/every/none) require
 *     a single-pair `on`.
 *   - contains/startsWith/endsWith compile to LIKE; TanStack's LIKE has no
 *     escape syntax, so '%' and '_' inside search values act as wildcards.
 *   - NEGATION IS NULL-SAFE (nullish semantics, not SQL 3VL): `not` and
 *     `notIn` MATCH rows where the field is null or was never written —
 *     { deleted: { not: true } } keeps rows with no `deleted` attr. This
 *     mirrors the scalar `null` filter convention (null ≡ missing). To
 *     exclude nulls, AND with { not: null } ("is present").
 *   - RELATION PUSH-DOWN HINTS (sync-layer contract; both OFF by default):
 *     · relationsWhere: a to-one relation filter with a primitive equality
 *       (e.g. { owner: { active: true } }) ALSO emits a locally-vacuous
 *       companion predicate on the root alias:
 *       or(eq(row["owner.active"], v), isUndefined(row["owner.active"])).
 *       "<label>.<field>" is never a real column, so the isUndefined arm
 *       makes it always-true locally — the join still does the real
 *       filtering. Sync layers may translate the dotted pseudo-field into a
 *       server-side association filter (InstaQL dot-notation, PostgREST
 *       embedded filters), or ignore it.
 *     · relationsOrderBy: each to-one label orderBy clause is followed by
 *       a twin clause over the dotted pseudo-field (same direction/nulls).
 *       Locally the twin is an all-ties no-op; sync layers whose backend can
 *       order by joined columns (e.g. PostgREST embedded-resource ordering)
 *       may push it.
 *     Pure query IR either way; no engine specifics. Leave both off unless
 *     the sync layer understands the dotted-pseudo-field convention — a
 *     naive predicate translator could mistake it for a real column.
 *   - Unmatched left-join metadata: nested objects keep TanStack's $synced /
 *     $key / $origin / $collectionId fields (deliberately not stripped).
 *
 * ESCAPE HATCH — anything not expressible here (full joins, flat multiplied
 * rows, aggregates over relations) is raw `useLiveQuery` territory.
 */

import type {
  Collection,
  InitialQueryBuilder,
  QueryBuilder,
} from "@tanstack/db"
import {
  and,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  isUndefined,
  like,
  lt,
  lte,
  materialize,
  not,
  or,
  Query,
  toArray,
} from "@tanstack/db"
import * as React from "react"
import { useLiveQuery } from "@/lib/instant-tanstack-db/use-live-query"

/* ================================================================== */
/* Types                                                              */
/* ================================================================== */

/**
 * TanStack DB's ref proxies, expression nodes, and builder contexts are
 * intentionally untyped at this layer — the public generics on the factory
 * are where type safety lives. These aliases centralize that decision.
 */
// biome-ignore lint/suspicious/noExplicitAny: ref proxies / expression nodes are untyped by design
type Refs = any
// biome-ignore lint/suspicious/noExplicitAny: built expression nodes are opaque
type Expr = any
// biome-ignore lint/suspicious/noExplicitAny: collection value types are erased internally
type AnyCollection = Collection<any, any, any>
// biome-ignore lint/suspicious/noExplicitAny: builder context is erased internally
type AnyQueryBuilder = QueryBuilder<any>
/**
 * Internal include node: label-keyed with an explicit `from`. The public maps
 * are TABLE-keyed with an optional `as` — normalizeIncludeTree converts them
 * before anything else runs, so the whole compiler speaks this shape.
 */
type AnyIncludeSpec = {
  from: string
  on: string | Record<string, string | undefined>
  as?: string
  many?: boolean
  required?: boolean
  emit?: boolean
  where?: Record<string, unknown>
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
  select?: ReadonlyArray<string>
  distinct?: string | ReadonlyArray<string>
  take?: number
  skip?: number
  include?: AnyIncludeMap
}
type AnyIncludeMap = Record<string, AnyIncludeSpec>
/** Empty object type whose keyof is never (unlike Record<string, never>). */
// biome-ignore lint/complexity/noBannedTypes: {} is the only type with keyof = never, required for empty-include inference
type Empty = {}
type Collections = Record<string, AnyCollection>

export type RowOf<C extends Collections, K extends keyof C> =
  C[K] extends Collection<infer R, Refs, Refs> ? R : never

/**
 * Insert/update input row: the read row plus write-only extras the collection
 * accepts on writes (e.g. sync-layer link columns — see LinkColumns in
 * create-collections.ts).
 */
export type WriteRowOf<C extends Collections, K extends keyof C> =
  C[K] extends Collection<Refs, Refs, Refs, Refs, infer W> ? W : never

/**
 * Optional fields accept `null` in write payloads: writing null UNSETS the
 * field (null ≡ missing — the same convention the query layer's filters
 * follow). Read rows stay `| undefined`; an unset field comes back absent.
 */
type NullClearable<T> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K]
}

type SortDir = "asc" | "desc"
export type SortSpec = SortDir | { sort: SortDir; nulls?: "first" | "last" }

/* ----------------------------- filters ---------------------------- */

export type ScalarFilter<V> =
  | V
  | null
  | ({
      equals?: V | null
      not?: V | null | ScalarFilter<V>
      in?: ReadonlyArray<V>
      notIn?: ReadonlyArray<V>
      lt?: V
      lte?: V
      gt?: V
      gte?: V
    } & (NonNullable<V> extends string
      ? {
          contains?: string
          startsWith?: string
          endsWith?: string
          mode?: "default" | "insensitive"
        }
      : Empty))

type FieldFilters<Row> = { [K in keyof Row]?: ScalarFilter<Row[K]> }

/** Filter body for a to-one relation (scalar fields + its own to-one labels). */
type ToOneBody<C extends Collections, F, Spec> = F extends keyof C
  ? WhereFor<C, F, Spec extends { include: infer NI } ? NI : Empty> | null
  : never

/** Filter for a to-many relation: quantified bodies only. */
type ManyFilter<C extends Collections, F, Spec> = F extends keyof C
  ? {
      some?: WhereFor<C, F, Spec extends { include: infer NI } ? NI : Empty>
      every?: WhereFor<C, F, Spec extends { include: infer NI } ? NI : Empty>
      none?: WhereFor<C, F, Spec extends { include: infer NI } ? NI : Empty>
    }
  : never

export type WhereFor<
  C extends Collections,
  K extends keyof C,
  I,
> = FieldFilters<RowOf<C, K>> & {
  AND?: WhereFor<C, K, I> | Array<WhereFor<C, K, I>>
  OR?: Array<WhereFor<C, K, I>>
  NOT?: WhereFor<C, K, I> | Array<WhereFor<C, K, I>>
} & {
  [F in keyof I as LabelOf<F, I[F]>]?: I[F] extends { many: true }
    ? ManyFilter<C, F, I[F]>
    : ToOneBody<C, F, I[F]>
}

/* ----------------------------- includes --------------------------- */

/** Scalar-only filter for nested-include data (relation refs not supported here). */
type ChildWhere<Row> = FieldFilters<Row> & {
  AND?: ChildWhere<Row> | Array<ChildWhere<Row>>
  OR?: Array<ChildWhere<Row>>
  NOT?: ChildWhere<Row> | Array<ChildWhere<Row>>
}

type ChildOrderBy<Row> =
  | { [F in keyof Row]?: SortSpec }
  | Array<{ [F in keyof Row]?: SortSpec }>

/**
 * The map key IS the target collection — keys complete from the schema.
 * `as` renames the output field (default: the table name); `where`, `orderBy`,
 * and `distinct` reference the relation by that output name.
 */
type IncludeSpecCommon<C extends Collections, F extends keyof C & string> = {
  /** Output field name; defaults to the table name (the map key). */
  as?: string
  /** Parent row must have a match. Cascades upward through nested includes. */
  required?: boolean
  /** Declare for filtering only — excluded from output and result type. */
  emit?: boolean
  where?: ChildWhere<RowOf<C, F>>
  orderBy?: ChildOrderBy<RowOf<C, F>>
  select?: ReadonlyArray<keyof RowOf<C, F> & string>
  include?: IncludeMap<C, RowOf<C, F>>
}

/**
 * Discriminated on cardinality: with the table fixed by the map key and
 * `many` written, `on`, `select`, `distinct`, `where`, `orderBy`, and nested
 * `include` all know the right row types — giving completion and errors on
 * field names.
 *
 * `on` string shorthand follows the FK:
 *   - to-one:  parent.<field> = target.<pk>   (field completes from the PARENT row)
 *   - many:    target.<field> = parent.<pk>   (field completes from the CHILD row)
 * The object form is always parentField -> targetField, either cardinality.
 */
export type IncludeSpec<
  C extends Collections,
  F extends keyof C & string,
  Row,
> =
  | (IncludeSpecCommon<C, F> & {
      many: true
      /** childField (FK on the child) -> parent.<pk>; or { parentField: childField }. */
      on:
        | (keyof RowOf<C, F> & string)
        | { [P in keyof Row & string]?: keyof RowOf<C, F> & string }
      take?: number
      skip?: number
      /** unique field combos per parent. Mutually exclusive with select. */
      distinct?:
        | (keyof RowOf<C, F> & string)
        | ReadonlyArray<keyof RowOf<C, F> & string>
    })
  | (IncludeSpecCommon<C, F> & {
      many?: false
      /** parentField (FK on the parent) -> target.<pk>; or { parentField: targetField }. */
      on:
        | (keyof Row & string)
        | { [P in keyof Row & string]?: keyof RowOf<C, F> & string }
      take?: never
      skip?: never
      distinct?: never
    })

type IncludeMap<C extends Collections, Row> = {
  [F in keyof C & string]?: IncludeSpec<C, F, Row>
}

/** Output field name of an include entry: `as` if given, else the table-name key. */
type LabelOf<F, Spec> = Spec extends { as: infer A extends string } ? A : F

/** Type error when an include's output name shadows a column of the model. */
type ForbidRowCollisions<Row, I> = {
  [F in keyof I as LabelOf<F, I[F]> extends keyof Row ? F : never]: never
}

/**
 * Homomorphic re-validation of the inferred include map. Besides checking, its
 * real job is IntelliSense: a defaulted generic (I = Empty) collapses the
 * contextual type during completion, killing key suggestions inside specs;
 * mapping over the partially-inferred I restores them.
 */
type ValidateIncludeMap<C extends Collections, Row, I> = {
  [F in keyof I]: F extends keyof C & string ? IncludeSpec<C, F, Row> : never
}

/* ----------------------------- orderBy ---------------------------- */

type OrderByObject<C extends Collections, K extends keyof C, I> = {
  [F in keyof RowOf<C, K>]?: SortSpec
} & {
  [F in keyof I as LabelOf<F, I[F]>]?: I[F] extends { many: true }
    ? never // cannot sort parents by an array
    : F extends keyof C
      ? OrderByObject<C, F, I[F] extends { include: infer NI } ? NI : Empty>
      : never
}

export type OrderByFor<C extends Collections, K extends keyof C, I> =
  | OrderByObject<C, K, I>
  | Array<OrderByObject<C, K, I>>

/* ----------------------------- distinct --------------------------- */

type DistinctEntry<C extends Collections, K extends keyof C, I> =
  | (keyof RowOf<C, K> & string)
  | {
      [F in keyof I as I[F] extends { many: true }
        ? never
        : LabelOf<F, I[F]> & string]?: F extends keyof C
        ? keyof RowOf<C, F> & string
        : never
    }

/* ----------------------------- args ------------------------------- */

export type FindManyArgs<
  C extends Collections,
  K extends keyof C,
  I extends IncludeMap<C, RowOf<C, K>> = Empty,
  S extends ReadonlyArray<keyof RowOf<C, K> & string> | undefined = undefined,
  D extends ReadonlyArray<DistinctEntry<C, K, I>> | undefined = undefined,
> = {
  include?: I &
    ValidateIncludeMap<C, RowOf<C, K>, I> &
    ForbidRowCollisions<RowOf<C, K>, I>
  /** Set false to disable the query (data stays placeholderData ?? undefined). */
  enabled?: boolean
  /**
   * Rows shown until the live query is ready (SSR / hydration). Display-only
   * fallback — never written to the collection. Typed as the exact result
   * shape so server-fetched rows must match the include/select structure.
   * Never part of query identity — changing it doesn't recompile.
   */
  placeholderData?: NoInfer<Array<FindManyResult<C, K, I, S, D>>>
  where?: WhereFor<C, K, NoInfer<I>>
  orderBy?: OrderByFor<C, K, NoInfer<I>>
  select?: S & (D extends ReadonlyArray<Expr> ? never : Empty) // select XOR distinct
  distinct?: D
  take?: number
  skip?: number
}

/* ----------------------------- results ---------------------------- */

type ChildShape<C extends Collections, F, Spec> = F extends keyof C
  ? Spec extends { distinct: infer D }
    ? Pick<
        RowOf<C, F>,
        (D extends ReadonlyArray<infer E> ? E : D) & keyof RowOf<C, F>
      >
    : (Spec extends { select: ReadonlyArray<infer Sel> }
        ? Pick<RowOf<C, F>, Sel & keyof RowOf<C, F>>
        : RowOf<C, F>) &
        (Spec extends { include: infer NI } ? IncludeResult<C, NI> : Empty)
  : never

type IncludeResult<C extends Collections, I> = {
  [F in keyof I as I[F] extends { emit: false }
    ? never
    : LabelOf<F, I[F]>]: I[F] extends { many: true }
    ? Array<ChildShape<C, F, I[F]>>
    : I[F] extends { required: true }
      ? ChildShape<C, F, I[F]>
      : ChildShape<C, F, I[F]> | null
}

// Prisma-style distinct returns full rows (first per combo), so D does not
// reshape the result — it only constrains which keys may be deduped on.
export type FindManyResult<
  C extends Collections,
  K extends keyof C,
  I extends IncludeMap<C, RowOf<C, K>>,
  S extends ReadonlyArray<keyof RowOf<C, K> & string> | undefined = undefined,
  _D extends ReadonlyArray<Expr> | undefined = undefined,
> = (S extends ReadonlyArray<infer Sel>
  ? Pick<RowOf<C, K>, Sel & keyof RowOf<C, K>>
  : RowOf<C, K>) &
  IncludeResult<C, I>

/* ----------------------------- write defaults --------------------- */

/** A default value, or a thunk re-evaluated on every write. */
type FieldDefault<V> = V | (() => V)

/** Union of every write-row field name across all collections. */
type AllWriteFields<C extends Collections> = {
  [K in keyof C]: keyof WriteRowOf<C, K> & string
}[keyof C]

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never

/**
 * Type a shared (`all`) default must satisfy: assignable to the field in
 * EVERY collection that has it. Collections without the field don't
 * constrain it — at runtime they skip it entirely (via the collection's
 * writableFields util). Each member is boxed in a tuple so optional fields
 * (`Date | undefined`) don't flatten into the union and intersect to never.
 */
type CommonFieldType<C extends Collections, F extends string> =
  UnionToIntersection<
    {
      [K in keyof C]: F extends keyof WriteRowOf<C, K>
        ? [WriteRowOf<C, K>[F]]
        : never
    }[keyof C]
  > extends [infer V]
    ? V
    : never

/**
 * Per-collection (or `$all`) field defaults. `$all` is a reserved
 * key — the `$` prefix is reserved for system namespaces, so it can't
 * collide with a user entity name.
 */
type WriteDefaults<C extends Collections> = {
  /** Applied to every collection that actually has the field. */
  $all?: {
    [F in AllWriteFields<C>]?: FieldDefault<CommonFieldType<C, F>>
  }
} & {
  [K in keyof C]?: {
    [F in keyof WriteRowOf<C, K>]?: FieldDefault<WriteRowOf<C, K>[F]>
  }
}

/** Keys of K's insert payload covered by configured insert defaults. */
type InsertDefaultedKeys<O, K> = (O extends {
  mutationDefaults: { insert: infer D }
}
  ?
      | (D extends { $all: infer A } ? keyof NonNullable<A> : never)
      | (K extends keyof D ? keyof NonNullable<D[K]> : never)
  : never) &
  string

/**
 * Insert payload: the write row with defaulted fields made optional — with
 * mutationDefaults: { insert: { $all: { createdAt: ... } } }, callers may
 * omit createdAt.
 */
type InsertData<C extends Collections, K extends keyof C, O> = Omit<
  NullClearable<WriteRowOf<C, K>>,
  InsertDefaultedKeys<O, K>
> &
  Partial<
    Pick<
      NullClearable<WriteRowOf<C, K>>,
      InsertDefaultedKeys<O, K> & keyof WriteRowOf<C, K>
    >
  >

export type CreateLofiOptions<C extends Collections> = {
  /** Primary key per collection; defaults to 'id'. */
  primaryKeys?: Partial<Record<keyof C & string, string>>
  /**
   * Emit relation-filter push-down hints (see header contract): a to-one
   * relation filter with a primitive equality ALSO emits a locally-vacuous
   * predicate over the dotted pseudo-field "<label>.<field>", which sync
   * layers whose backend supports association filters (InstaQL dot-notation
   * where, PostgREST embedded filters) may push server-side. OFF by default:
   * the hint is harmless locally but a foreign predicate translator could
   * mistake the dotted field for a real column. Enable per app when the sync
   * layer understands the convention.
   */
  relationsWhere?: boolean
  /**
   * Emit relation-orderBy push-down hints: each to-one label orderBy clause
   * is followed by a twin clause over the dotted pseudo-field with the same
   * direction/nulls. Locally the twin is an all-ties no-op (the pseudo-field
   * never exists on a row); sync layers whose backend can order by joined
   * columns (e.g. PostgREST embedded-resource ordering) may push it. OFF by
   * default, same reasoning as relationsWhere.
   */
  relationsOrderBy?: boolean
  /**
   * Field defaults for mutations, keyed per collection or `$all` (every
   * collection that has the field). Thunks re-evaluate on each write;
   * explicitly passed fields always win.
   *
   * - `insert`: injected into insertItem payloads; defaulted fields become
   *   OPTIONAL in insertItem's payload type.
   * - `update`: applied at the START of every updateItem, before the patch /
   *   draft mutator runs (so explicit changes win) — e.g. updatedAt.
   *
   *   mutationDefaults: { insert: { $all: { createdAt: () => new Date() } } }
   */
  mutationDefaults?: {
    insert?: WriteDefaults<C>
    update?: WriteDefaults<C>
  }
}

type LiveQueryExtras = {
  isLoading: boolean
  isReady: boolean
  isError: boolean
  status: string
  /**
   * True while `data` is the caller's placeholderData (TanStack Query
   * convention): the hook reports SUCCESS — isLoading false, isReady true —
   * because the data is usable now; this flag marks the background
   * revalidation for consumers that want a subtle indicator.
   */
  isPlaceholderData: boolean
}

/* ================================================================== */
/* Runtime — scalar filter compiler                                   */
/* ================================================================== */

const LOGICAL_KEYS = new Set(["AND", "OR", "NOT"])

/** Invariant lookup: the plan phase registered this key before the build phase reads it. */
function mustGet<K, V>(map: Map<K, V>, key: K, what: string): V {
  const v = map.get(key)
  if (v === undefined)
    throw new Error(`create-lofi: internal — missing ${what}`)
  return v
}
const QUANTIFIERS = new Set(["some", "every", "none"])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    Object.getPrototypeOf(v) === Object.prototype
  )
}

function likePattern(op: string, value: string): string {
  if (op === "contains") return `%${value}%`
  if (op === "startsWith") return `${value}%`
  return `%${value}`
}

/**
 * A scalar `null` filter matches null OR MISSING: rows synced from a store
 * where the attr was never written carry `undefined`, and TanStack's
 * evaluators are strict (isNull(undefined) === false, SQL 3VL elsewhere) —
 * a bare isNull would silently drop attr-less rows.
 */
function isMissing(field: Expr): Expr {
  return or(isNull(field), isUndefined(field))
}

/**
 * Whether a scalar filter MATCHES a field that is null/missing, under this
 * layer's null-safe semantics (null ≡ missing; negations match missing).
 * Drives the explicit isMissing arm compiled into `not` below: without it,
 * TanStack's 3VL evaluators return unknown for not(eq(undefined, v)) and
 * silently drop attr-less rows.
 *
 * Object form ANDs its operators, so it matches missing only if every
 * present operator does.
 */
function filterMatchesMissing(filter: unknown): boolean {
  if (filter === null) return true
  if (!isPlainObject(filter)) return false
  for (const [op, value] of Object.entries(filter)) {
    if (value === undefined || op === "mode") continue
    const matches =
      op === "equals"
        ? value === null
        : op === "not"
          ? !filterMatchesMissing(value)
          : op === "notIn"
    if (!matches) return false
  }
  return true
}

function compileFieldFilter(field: Expr, filter: unknown): Expr {
  if (filter === null) return isMissing(field)
  if (!isPlainObject(filter)) return eq(field, filter)

  const insensitive = (filter as { mode?: string }).mode === "insensitive"
  const likeFn = insensitive ? ilike : like
  const clauses: Array<Expr> = []

  for (const [op, value] of Object.entries(filter)) {
    if (value === undefined || op === "mode") continue
    switch (op) {
      case "equals":
        clauses.push(value === null ? isMissing(field) : eq(field, value))
        break
      case "not": {
        // Null-safe negation: a missing field fails every positive filter,
        // so its negation must MATCH missing rows. TanStack's 3VL evaluators
        // make not(eq(undefined, v)) unknown — an explicit isMissing arm
        // keeps attr-less rows in. Skipped when the negated filter itself
        // matches missing (not: null = "is present").
        const negated =
          value === null ? isMissing(field) : compileFieldFilter(field, value)
        clauses.push(
          filterMatchesMissing(value)
            ? not(negated)
            : or(not(negated), isMissing(field)),
        )
        break
      }
      case "in":
        clauses.push(inArray(field, value as Array<Expr>))
        break
      case "notIn":
        // Null-safe like `not` above: notIn matches missing fields.
        clauses.push(
          or(not(inArray(field, value as Array<Expr>)), isMissing(field)),
        )
        break
      case "lt":
        clauses.push(lt(field, value))
        break
      case "lte":
        clauses.push(lte(field, value))
        break
      case "gt":
        clauses.push(gt(field, value))
        break
      case "gte":
        clauses.push(gte(field, value))
        break
      case "contains":
      case "startsWith":
      case "endsWith":
        clauses.push(likeFn(field, likePattern(op, String(value))))
        break
      default:
        throw new Error(
          `create-lofi: unknown filter operator "${op}". ` +
            `Supported: equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith, mode. ` +
            `If this field was meant as a relation, it is not a declared include label — declare it in "include" (emit: false if you only need it for filtering).`,
        )
    }
  }
  if (clauses.length === 0)
    throw new Error("create-lofi: empty filter object for a field.")
  return allOf(clauses)
}

/**
 * Primitive equality value of a scalar filter, for relation-filter
 * annotations — bare primitives and pure `{ equals: v }` only. Anything
 * narrower/wider (ranges, negations, nulls, dates) returns undefined and
 * emits no annotation; the local join already filters correctly without one.
 */
function annotationValue(
  filter: unknown,
): string | number | boolean | undefined {
  const isPrim = (v: unknown): v is string | number | boolean =>
    typeof v === "string" || typeof v === "number" || typeof v === "boolean"
  if (isPrim(filter)) return filter
  if (isPlainObject(filter)) {
    const keys = Object.keys(filter).filter((k) => filter[k] !== undefined)
    if (keys.length === 1 && keys[0] === "equals" && isPrim(filter.equals))
      return filter.equals
  }
  return undefined
}

function allOf(clauses: Array<Expr>): Expr {
  return clauses.length === 1
    ? clauses[0]
    : and(...(clauses as [Expr, Expr, ...Array<Expr>]))
}
function anyOf(clauses: Array<Expr>): Expr {
  return clauses.length === 1
    ? clauses[0]
    : or(...(clauses as [Expr, Expr, ...Array<Expr>]))
}

/* ================================================================== */
/* Runtime — relation planning                                        */
/* ================================================================== */

type Plan = {
  collections: Collections
  rootModel: string
  pkOf: (name: string) => string
  /** Emit relation-filter push-down hints (CreateLofiOptions.relationsWhere). */
  relationsWhere: boolean
  /** to-one ref chains: path "owner" / "owner.org" -> hidden alias */
  chainAliases: Map<string, string>
  chainSpecs: Map<string, { spec: AnyIncludeSpec; parentPath: string }>
  /** quantified/required filter joins: signature -> { alias } */
  filterJoins: Map<
    string,
    { alias: string; subquery: Expr; parentField: string }
  >
  counter: { n: number }
}

/**
 * Resolve `on` into [parentField, targetField] pairs.
 * String shorthand follows the FK: to-one -> [on, target pk];
 * many -> [parent pk, on] (the FK lives on the child).
 */
function resolvePairs(
  spec: AnyIncludeSpec,
  parentModel: string,
  pkOf: (n: string) => string,
): Array<[string, string]> {
  if (typeof spec.on === "string") {
    return spec.many
      ? [[pkOf(parentModel), spec.on]]
      : [[spec.on, pkOf(spec.from)]]
  }
  return Object.entries(spec.on).filter(
    (e): e is [string, string] => e[1] !== undefined,
  )
}

function singlePair(
  spec: AnyIncludeSpec,
  parentModel: string,
  pkOf: (n: string) => string,
  context: string,
): [string, string] {
  const pairs = resolvePairs(spec, parentModel, pkOf)
  if (pairs.length === 0)
    throw new Error(
      `create-lofi: include "on" must specify at least one field pair.`,
    )
  if (pairs.length > 1 && context !== "fetch")
    throw new Error(
      `create-lofi: composite "on" keys are only supported for fetching, not for ${context}.`,
    )
  const first = pairs[0]
  if (!first)
    throw new Error(
      `create-lofi: include "on" must specify at least one field pair.`,
    )
  return first
}

function allPairs(
  spec: AnyIncludeSpec,
  parentModel: string,
  pkOf: (n: string) => string,
): Array<[string, string]> {
  return resolvePairs(spec, parentModel, pkOf)
}

/** Resolve/register the hidden left-join chain for a to-one label path. */
function ensureChain(
  plan: Plan,
  includeTree: AnyIncludeMap | undefined,
  path: Array<string>,
): string {
  let tree = includeTree
  let parentPath = ""
  let fullPath = ""
  let alias = ""
  for (const label of path) {
    fullPath = fullPath ? `${fullPath}.${label}` : label
    const spec = tree?.[label]
    if (!spec)
      throw new Error(
        `create-lofi: "${fullPath}" is not a declared include label (relation refs in where/orderBy/distinct must be declared in "include").`,
      )
    if (spec.many)
      throw new Error(
        `create-lofi: "${fullPath}" is a to-many include — use { some | every | none } in where; to-many labels cannot be used in orderBy/distinct.`,
      )
    if (!plan.chainAliases.has(fullPath)) {
      const a = `__r${plan.counter.n++}`
      plan.chainAliases.set(fullPath, a)
      plan.chainSpecs.set(fullPath, { spec, parentPath })
    }
    alias = mustGet(
      plan.chainAliases,
      fullPath,
      `chain alias for "${fullPath}"`,
    )
    parentPath = fullPath
    tree = spec.include as AnyIncludeMap | undefined
  }
  return alias
}

/**
 * Build the (uncorrelated) subquery for a quantified relation condition:
 * SELECT DISTINCT <correlation target field> FROM target [chain joins] WHERE cond.
 * Joined to the parent, isDefined(alias.__k) === EXISTS(...).
 */
function buildFilterSubquery(
  plan: Plan,
  spec: AnyIncludeSpec,
  body: Record<string, unknown> | null,
  negateBody: boolean,
): { subquery: Expr; parentField: string } {
  const target = plan.collections[spec.from]
  if (!target)
    throw new Error(
      `create-lofi: relation references unknown collection "${spec.from}".`,
    )
  const [parentField, targetField] = singlePair(
    spec,
    plan.rootModel,
    plan.pkOf,
    "relation filters",
  )

  // Collect nested to-one chains referenced inside the body.
  const localChains = new Map<
    string,
    { alias: string; spec: AnyIncludeSpec; parent: string; parentModel: string }
  >()
  const registerLocal = (
    tree: AnyIncludeMap | undefined,
    path: Array<string>,
  ): string => {
    let t = tree
    let parent = "c"
    let parentModel = spec.from
    let full = ""
    let alias = ""
    for (const label of path) {
      full = full ? `${full}.${label}` : label
      const s = t?.[label]
      if (!s)
        throw new Error(
          `create-lofi: "${full}" is not a declared nested include of "${spec.from}".`,
        )
      if (s.many)
        throw new Error(
          `create-lofi: nested to-many quantifiers inside some/every/none are not supported in v1 — restructure with required includes.`,
        )
      if (!localChains.has(full)) {
        alias = `n${localChains.size}`
        localChains.set(full, { alias, spec: s, parent, parentModel })
      } else {
        alias = mustGet(localChains, full, `local chain "${full}"`).alias
      }
      parent = alias
      parentModel = s.from
      t = s.include as AnyIncludeMap | undefined
    }
    return alias
  }

  const compileBody = (
    refs: Refs,
    base: Refs,
    w: Record<string, unknown>,
    tree: AnyIncludeMap | undefined,
    pathPrefix: Array<string>,
  ): Expr => {
    const clauses: Array<Expr> = []
    for (const [key, value] of Object.entries(w)) {
      if (value === undefined) continue
      if (LOGICAL_KEYS.has(key)) {
        const branches = (Array.isArray(value) ? value : [value]) as Array<
          Record<string, unknown>
        >
        const compiled = branches.map((b) =>
          compileBody(refs, base, b, tree, pathPrefix),
        )
        if (key === "OR") clauses.push(anyOf(compiled))
        else if (key === "NOT") for (const c of compiled) clauses.push(not(c))
        else clauses.push(...compiled)
        continue
      }
      if (tree && key in tree) {
        const alias = registerLocal(
          (pathPrefix.length ? undefined : tree) ?? tree,
          [...pathPrefix, key],
        )
        clauses.push(
          compileBody(
            refs,
            refs[alias],
            value as Record<string, unknown>,
            tree[key]?.include,
            [],
          ),
        )
        continue
      }
      clauses.push(compileFieldFilter(base[key], value))
    }
    if (clauses.length === 0) return undefined
    return allOf(clauses)
  }

  // First pass registers chains (compileBody call inside .where does the work,
  // but joins must be attached BEFORE where — so pre-walk to register).
  const preWalk = (
    w: Record<string, unknown> | null,
    tree: AnyIncludeMap | undefined,
  ) => {
    if (!w) return
    for (const [key, value] of Object.entries(w)) {
      if (value === undefined) continue
      if (LOGICAL_KEYS.has(key)) {
        const branches = (Array.isArray(value) ? value : [value]) as Array<
          Record<string, unknown>
        >
        for (const b of branches) preWalk(b, tree)
      } else if (tree && key in tree) {
        registerLocal(tree, [key])
        preWalk(
          value as Record<string, unknown>,
          tree[key]?.include as AnyIncludeMap | undefined,
        )
        // nested-of-nested paths register lazily inside compileBody via parent alias
      }
    }
  }
  preWalk(body, spec.include as AnyIncludeMap | undefined)

  let sub: Expr = new Query().from({ c: target })
  for (const [, { alias, spec: s, parent, parentModel }] of localChains) {
    const [pf, tf] = singlePair(s, parentModel, plan.pkOf, "relation filters")
    const tcol = plan.collections[s.from]
    if (!tcol)
      throw new Error(
        `create-lofi: relation references unknown collection "${s.from}".`,
      )
    sub = sub.innerJoin({ [alias]: tcol }, (t: Refs) =>
      eq(t[parent][pf], t[alias][tf]),
    )
  }
  sub = sub.where((t: Refs) => {
    const compiled = body
      ? compileBody(t, t.c, body, spec.include, [])
      : undefined
    const cond = compiled === undefined ? eq(1 as Expr, 1 as Expr) : compiled
    return negateBody ? not(cond) : cond
  })
  sub = sub.select((t: Refs) => ({ __k: t.c[targetField] })).distinct()
  return { subquery: sub, parentField }
}

function filterJoinAlias(
  plan: Plan,
  spec: AnyIncludeSpec,
  body: Record<string, unknown> | null,
  negateBody: boolean,
): { alias: string; parentField: string } {
  const sig = JSON.stringify([spec.from, spec.on, body, negateBody])
  let entry = plan.filterJoins.get(sig)
  if (!entry) {
    const { subquery, parentField } = buildFilterSubquery(
      plan,
      spec,
      body,
      negateBody,
    )
    entry = { alias: `__f${plan.counter.n++}`, subquery, parentField }
    plan.filterJoins.set(sig, entry)
  }
  return { alias: entry.alias, parentField: entry.parentField }
}

/* ================================================================== */
/* Runtime — top-level where compiler                                  */
/* ================================================================== */

function compileTopWhere(
  plan: Plan,
  includeTree: AnyIncludeMap | undefined,
  refs: Refs,
  base: Refs,
  where: Record<string, unknown>,
  /** current to-one chain path prefix ('' at root) */
  pathPrefix: string,
): Expr {
  const clauses: Array<Expr> = []
  const treeAt = (path: string): AnyIncludeMap | undefined => {
    if (!path) return includeTree
    let t = includeTree
    for (const seg of path.split(".")) {
      t = t?.[seg]?.include as AnyIncludeMap | undefined
    }
    return t
  }
  const tree = treeAt(pathPrefix)

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue

    if (LOGICAL_KEYS.has(key)) {
      const branches = (Array.isArray(value) ? value : [value]) as Array<
        Record<string, unknown>
      >
      const compiled = branches
        .map((b) =>
          compileTopWhere(plan, includeTree, refs, base, b, pathPrefix),
        )
        .filter((c) => c !== undefined)
      if (compiled.length === 0) continue
      if (key === "OR") clauses.push(anyOf(compiled))
      else if (key === "NOT") for (const c of compiled) clauses.push(not(c))
      else clauses.push(...compiled)
      continue
    }

    const spec = tree?.[key]
    if (spec) {
      const path = pathPrefix ? `${pathPrefix}.${key}` : key

      if (spec.many) {
        if (value === null)
          throw new Error(
            `create-lofi: "${path}: null" is not valid on a to-many relation — use { none: {} }.`,
          )
        if (
          !isPlainObject(value) ||
          ![...Object.keys(value)].every((k) => QUANTIFIERS.has(k))
        )
          throw new Error(
            `create-lofi: filters on to-many relation "${path}" must use { some | every | none }.`,
          )
        for (const [quant, body] of Object.entries(value)) {
          if (body === undefined) continue
          if (!isPlainObject(body))
            throw new Error(
              `create-lofi: "${path}.${quant}" must be a filter object.`,
            )
          if (quant === "some") {
            const { alias, parentField } = filterJoinAlias(
              plan,
              spec,
              body,
              false,
            )
            clauses.push(not(isUndefined(refs[alias].__k)))
            void parentField
          } else if (quant === "none") {
            const { alias } = filterJoinAlias(plan, spec, body, false)
            clauses.push(isUndefined(refs[alias].__k))
          } else {
            // every = no child FAILS the condition
            const { alias } = filterJoinAlias(plan, spec, body, true)
            clauses.push(isUndefined(refs[alias].__k))
          }
        }
        continue
      }

      // to-one label
      if (value === null) {
        const alias = ensureChain(plan, includeTree, path.split("."))
        const [, targetField] = singlePair(
          spec,
          parentModelAt(plan, includeTree, pathPrefix),
          plan.pkOf,
          "relation filters",
        )
        clauses.push(isUndefined(refs[alias][targetField]))
        continue
      }
      if (!isPlainObject(value))
        throw new Error(
          `create-lofi: filter on relation "${path}" must be an object or null.`,
        )
      if ([...Object.keys(value)].some((k) => QUANTIFIERS.has(k)))
        throw new Error(
          `create-lofi: some/every/none are only valid on to-many (many: true) relations — "${path}" is to-one.`,
        )
      const alias = ensureChain(plan, includeTree, path.split("."))
      clauses.push(
        compileTopWhere(plan, includeTree, refs, refs[alias], value, path),
      )
      continue
    }

    clauses.push(compileFieldFilter(base[key], value))

    // Relation-filter push-down hint (see header contract; opt-in): inside a
    // to-one body, additionally emit a locally-vacuous predicate on the ROOT
    // alias over the dotted pseudo-field "<path>.<field>". The isUndefined
    // arm is always true locally (the pseudo-field never exists on a row);
    // sync layers may translate it into a server-side association filter.
    if (pathPrefix && plan.relationsWhere) {
      const v = annotationValue(value)
      if (v !== undefined) {
        const pseudo = `${pathPrefix}.${key}`
        clauses.push(or(eq(refs.row[pseudo], v), isUndefined(refs.row[pseudo])))
      }
    }
  }

  if (clauses.length === 0) return undefined
  return allOf(clauses)
}

/** Resolve the parent model name at a dotted to-one path prefix ('' = root). */
function parentModelAt(
  plan: Plan,
  includeTree: AnyIncludeMap | undefined,
  pathPrefix: string,
): string {
  if (!pathPrefix) return plan.rootModel
  let tree = includeTree
  let modelName = plan.rootModel
  for (const seg of pathPrefix.split(".")) {
    const spec = tree?.[seg]
    if (!spec) return modelName
    modelName = spec.from
    tree = spec.include as AnyIncludeMap | undefined
  }
  return modelName
}

/** Pre-walk where/orderBy/distinct to register chains & filter joins before .where runs. */
function preRegister(
  plan: Plan,
  includeTree: AnyIncludeMap | undefined,
  where: Record<string, unknown> | undefined,
  pathPrefix: string,
) {
  if (!where) return
  const treeAt = (path: string): AnyIncludeMap | undefined => {
    if (!path) return includeTree
    let t = includeTree
    for (const seg of path.split("."))
      t = t?.[seg]?.include as AnyIncludeMap | undefined
    return t
  }
  const tree = treeAt(pathPrefix)
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (LOGICAL_KEYS.has(key)) {
      const branches = (Array.isArray(value) ? value : [value]) as Array<
        Record<string, unknown>
      >
      for (const b of branches) preRegister(plan, includeTree, b, pathPrefix)
      continue
    }
    const spec = tree?.[key]
    if (!spec) continue
    const path = pathPrefix ? `${pathPrefix}.${key}` : key
    if (spec.many) {
      if (isPlainObject(value)) {
        for (const [quant, body] of Object.entries(value)) {
          if (!isPlainObject(body)) continue
          if (quant === "some" || quant === "none")
            filterJoinAlias(plan, spec, body, false)
          else if (quant === "every") filterJoinAlias(plan, spec, body, true)
        }
      }
      continue
    }
    ensureChain(plan, includeTree, path.split("."))
    if (isPlainObject(value)) preRegister(plan, includeTree, value, path)
  }
}

/** Register required-cascade filters: each required include (any depth) => EXISTS path. */
function registerRequired(
  plan: Plan,
  includeTree: AnyIncludeMap | undefined,
  predicates: Array<(refs: Refs) => Expr>,
) {
  const walk = (
    tree: AnyIncludeMap | undefined,
    rootLabel: string | null,
    rootSpec: AnyIncludeSpec | null,
    bodyPath: Array<string>,
  ) => {
    if (!tree) return
    for (const [label, spec] of Object.entries(tree)) {
      const isRoot = rootLabel === null
      const curRootLabel = rootLabel ?? label
      const curRootSpec = rootSpec ?? spec
      const curBodyPath = isRoot ? [] : [...bodyPath, label]

      if (spec.required) {
        // Build EXISTS on the ROOT relation with a body that walks down to this node.
        let body: Record<string, unknown> = spec.where ? { ...spec.where } : {}
        // wrap upward from this node to just below the root
        for (let i = curBodyPath.length - 1; i >= 0; i--) {
          const seg = curBodyPath[i]
          if (seg !== undefined) body = { [seg]: body }
        }
        // include intermediate wheres? Intermediate nodes' own `where` filters
        // nested data, not parents — only `required` participates. The chain
        // itself (inner joins) enforces existence.
        const { alias } = filterJoinAlias(
          plan,
          curRootSpec,
          Object.keys(body).length ? body : null,
          false,
        )
        predicates.push((refs: Refs) => not(isUndefined(refs[alias].__k)))
      }
      walk(spec.include, curRootLabel, curRootSpec, curBodyPath)
    }
  }
  walk(includeTree, null, null, [])
}

/* ================================================================== */
/* Runtime — output subqueries                                        */
/* ================================================================== */

function childOrderBys(
  spec: AnyIncludeSpec,
): Array<[string, SortDir, "first" | "last"]> {
  const list = spec.orderBy
    ? Array.isArray(spec.orderBy)
      ? spec.orderBy
      : [spec.orderBy]
    : []
  const out: Array<[string, SortDir, "first" | "last"]> = []
  for (const ob of list) {
    for (const [field, v] of Object.entries(ob)) {
      if (v === undefined) continue
      const sort: SortDir =
        typeof v === "string" ? (v as SortDir) : (v as { sort: SortDir }).sort
      const nulls: "first" | "last" =
        typeof v === "string"
          ? "last"
          : ((v as { nulls?: "first" | "last" }).nulls ?? "last")
      out.push([field, sort, nulls])
    }
  }
  return out
}

function buildIncludeOutput(
  plan: Plan,
  t: Refs,
  spec: AnyIncludeSpec,
  parentModel: string,
): Expr {
  const target = plan.collections[spec.from]
  if (!target)
    throw new Error(
      `create-lofi: include references unknown collection "${spec.from}".`,
    )
  const targetPk = plan.pkOf(spec.from)
  const pairs = allPairs(spec, parentModel, plan.pkOf)
  // NOTE: nested subqueries MUST use unique aliases — reusing an alias across
  // nesting levels makes TanStack DB silently return null (upstream bug).
  const a = `s${plan.counter.n++}`

  let sub: Expr = new Query().from({ [a]: target }).where((s: Refs) => {
    const clauses: Array<Expr> = pairs.map(([pf, tf]) =>
      eq(s[a][tf], t.row?.[pf] ?? t[pf]),
    )
    if (spec.where) {
      const compiled = compileChildWhere(s, s[a], spec.where)
      if (compiled !== undefined) clauses.push(compiled)
    }
    return allOf(clauses)
  })

  let ordered = false
  for (const [field, sort, nulls] of childOrderBys(spec)) {
    sub = sub.orderBy((s: Refs) => s[a][field], { direction: sort, nulls })
    ordered = true
  }
  if ((spec.take !== undefined || spec.skip !== undefined) && !ordered) {
    // nulls: 'first' — PKs are never null, and 'first' matches
    // DEFAULT_COMPARE_OPTIONS so findIndexForField can use the pk index
    // (matchesCompareOptions deep-equals everything except direction).
    sub = sub.orderBy((s: Refs) => s[a][targetPk], {
      direction: "asc",
      nulls: "first",
    })
  }
  if (spec.skip !== undefined) sub = sub.offset(spec.skip)
  if (spec.take !== undefined) sub = sub.limit(spec.take)

  const distinctFields = spec.distinct
    ? typeof spec.distinct === "string"
      ? [spec.distinct]
      : [...spec.distinct]
    : undefined

  if (distinctFields) {
    // engine distinct() is broken inside correlated includes — project only;
    // dedupe happens in the post-transform.
    sub = sub.select((s: Refs) => {
      const o: Record<string, Expr> = {}
      for (const f of distinctFields) o[f] = s[a][f]
      return o
    })
    return toArray(sub)
  }

  const nested = spec.include
  if (spec.select || nested) {
    sub = sub.select((s: Refs) => {
      const o: Record<string, Expr> = spec.select
        ? Object.fromEntries(spec.select.map((f) => [f, s[a][f]]))
        : { ...s[a] }
      if (nested) {
        for (const [label, nspec] of Object.entries(nested)) {
          if (nspec.emit === false) continue
          o[label] = buildIncludeOutput(plan, { row: s[a] }, nspec, spec.from)
        }
      }
      return o
    })
  }

  return spec.many ? toArray(sub) : materialize(sub.findOne())
}

/** child-level where: scalar filters only (relation refs inside child where not supported in v1). */
function compileChildWhere(
  refs: Refs,
  base: Refs,
  where: Record<string, unknown>,
): Expr {
  const clauses: Array<Expr> = []
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (LOGICAL_KEYS.has(key)) {
      const branches = (Array.isArray(value) ? value : [value]) as Array<
        Record<string, unknown>
      >
      const compiled = branches.map((b) => compileChildWhere(refs, base, b))
      if (key === "OR") clauses.push(anyOf(compiled))
      else if (key === "NOT") for (const c of compiled) clauses.push(not(c))
      else clauses.push(...compiled)
      continue
    }
    clauses.push(compileFieldFilter(base[key], value))
  }
  if (clauses.length === 0) return undefined
  return allOf(clauses)
}

/* ================================================================== */
/* Runtime — validation                                               */
/* ================================================================== */

/**
 * Public include maps are keyed by TABLE name with an optional `as` output
 * label; the compiler (and the label refs in where/orderBy/distinct) works on
 * a label-keyed tree with an explicit `from`. Flip one into the other.
 */
function normalizeIncludeTree(
  include: Record<string, unknown> | undefined,
): AnyIncludeMap | undefined {
  if (!include) return undefined
  const out: AnyIncludeMap = {}
  for (const [from, value] of Object.entries(include)) {
    if (value === undefined) continue
    const raw = value as Omit<AnyIncludeSpec, "from" | "include"> & {
      include?: Record<string, unknown>
    }
    const label = raw.as ?? from
    if (label in out)
      throw new Error(
        `create-lofi: two includes resolve to the output name "${label}" — set "as" to disambiguate.`,
      )
    out[label] = { ...raw, from, include: normalizeIncludeTree(raw.include) }
  }
  return out
}

function validateArgs(
  collections: Collections,
  model: string,
  args: Record<string, unknown> | undefined,
  includeTree: AnyIncludeMap | undefined,
) {
  const row0 = collections[model]
  if (!row0)
    throw new Error(
      `create-lofi: unknown collection "${model}". Known: ${Object.keys(collections).join(", ")}`,
    )
  const walkIncludes = (
    tree: Record<string, AnyIncludeSpec> | undefined,
    path: string,
  ) => {
    if (!tree) return
    for (const [label, spec] of Object.entries(tree)) {
      const p = path ? `${path}.${label}` : label
      if (!collections[spec.from])
        throw new Error(
          `create-lofi: include "${p}" references unknown collection "${spec.from}".`,
        )
      if (label === "row")
        throw new Error(
          `create-lofi: include output name "row" is reserved — rename it with "as".`,
        )
      if (spec.distinct !== undefined) {
        if (!spec.many)
          throw new Error(
            `create-lofi: include "${p}" uses distinct without many: true.`,
          )
        if (spec.select)
          throw new Error(
            `create-lofi: include "${p}" — distinct IS the projection; remove select.`,
          )
      }
      if ((spec.take !== undefined || spec.skip !== undefined) && !spec.many)
        throw new Error(
          `create-lofi: include "${p}" uses take/skip without many: true.`,
        )
      walkIncludes(spec.include, p)
    }
  }
  walkIncludes(includeTree, "")
  if (args?.distinct && args?.select)
    throw new Error(
      `create-lofi: select cannot be combined with distinct — the dedup key fields must be present on the row.`,
    )
}

/**
 * Normalize top-level distinct into dedup-key entries and validate label
 * entries against the include tree. Label entries read the NESTED OUTPUT
 * (row[label][field]), so the include must be to-one and emitted.
 */
function normalizeTopDistinct(
  distinct: Array<string | Record<string, string>> | string | undefined,
  includeTree: AnyIncludeMap | undefined,
): Array<{ label: string | null; field: string }> | null {
  if (distinct === undefined) return null
  const list = typeof distinct === "string" ? [distinct] : distinct
  const out: Array<{ label: string | null; field: string }> = []
  for (const entry of list) {
    if (typeof entry === "string") {
      out.push({ label: null, field: entry })
      continue
    }
    for (const [label, field] of Object.entries(entry)) {
      if (field === undefined) continue
      const spec = includeTree?.[label]
      if (!spec)
        throw new Error(
          `create-lofi: distinct label "${label}" is not a declared include label.`,
        )
      if (spec.many)
        throw new Error(
          `create-lofi: distinct label "${label}" is a to-many include — distinct keys require to-one.`,
        )
      if (spec.emit === false)
        throw new Error(
          `create-lofi: distinct label "${label}" is emit: false — the dedup key reads the nested output, so the include must be emitted.`,
        )
      out.push({ label, field })
    }
  }
  return out.length > 0 ? out : null
}

/* ================================================================== */
/* Runtime — the compiler                                             */
/* ================================================================== */

export function compileFindMany<C extends Collections>(
  collections: C,
  model: keyof C & string,
  args: Record<string, unknown> | undefined,
  options?: CreateLofiOptions<C>,
): {
  queryFn: (q: InitialQueryBuilder) => AnyQueryBuilder
  transform: ((rows: Array<Expr>) => Array<Expr>) | null
} {
  const pkOf = (name: string) => options?.primaryKeys?.[name] ?? "id"
  const a = (args ?? {}) as {
    include?: Record<string, unknown>
    where?: Record<string, unknown>
    orderBy?: Record<string, unknown> | Array<Record<string, unknown>>
    select?: Array<string>
    distinct?: Array<string | Record<string, string>>
    take?: number
    skip?: number
  }
  const includeTree = normalizeIncludeTree(a.include)
  validateArgs(collections, model, args, includeTree)
  const topDistinct = normalizeTopDistinct(a.distinct, includeTree)

  const queryFn = (q: InitialQueryBuilder): AnyQueryBuilder => {
    const plan: Plan = {
      collections,
      rootModel: model,
      pkOf,
      relationsWhere: options?.relationsWhere === true,
      chainAliases: new Map(),
      chainSpecs: new Map(),
      filterJoins: new Map(),
      counter: { n: 0 },
    }

    // --- plan phase: discover every hidden join we need -------------
    preRegister(plan, includeTree, a.where, "")
    const requiredPreds: Array<(refs: Refs) => Expr> = []
    registerRequired(plan, includeTree, requiredPreds)

    const orderEntries: Array<{
      path: Array<string> | null
      field: string
      sort: SortDir
      nulls: "first" | "last"
    }> = []
    const obList = a.orderBy
      ? Array.isArray(a.orderBy)
        ? a.orderBy
        : [a.orderBy]
      : []
    const collectOrder = (ob: Record<string, unknown>, path: Array<string>) => {
      const tree = path.reduce<AnyIncludeMap | undefined>(
        (t, seg) => t?.[seg]?.include as AnyIncludeMap | undefined,
        includeTree,
      )
      for (const [key, v] of Object.entries(ob)) {
        if (v === undefined) continue
        const spec = tree?.[key]
        if (spec) {
          if (spec.many)
            throw new Error(
              `create-lofi: cannot orderBy through to-many relation "${[...path, key].join(".")}".`,
            )
          ensureChain(plan, includeTree, [...path, key])
          collectOrder(v as Record<string, Expr>, [...path, key])
        } else {
          const sv = v as SortSpec
          const sort: SortDir = typeof sv === "string" ? sv : sv.sort
          const nulls: "first" | "last" =
            typeof sv === "string" ? "last" : (sv.nulls ?? "last")
          orderEntries.push({
            path: path.length ? path : null,
            field: key,
            sort,
            nulls,
          })
          // Relation-orderBy push-down hint (opt-in): follow the join-alias
          // clause with a twin over the dotted pseudo-field. Locally it's an
          // all-ties no-op (the pseudo-field never exists on a row); sync
          // layers whose backend orders by joined columns may push it.
          if (path.length && options?.relationsOrderBy) {
            orderEntries.push({
              path: null,
              field: [...path, key].join("."),
              sort,
              nulls,
            })
          }
        }
      }
    }
    for (const ob of obList) collectOrder(ob, [])

    // --- build phase -------------------------------------------------
    const root = collections[model]
    if (!root) throw new Error(`create-lofi: unknown collection "${model}".`)
    let query: Expr = q.from({ row: root })

    // to-one ref chains (ordered so parents attach before children)
    const chainPaths = [...plan.chainAliases.keys()].sort(
      (a, b) => a.split(".").length - b.split(".").length,
    )
    for (const path of chainPaths) {
      const alias = mustGet(plan.chainAliases, path, `chain alias "${path}"`)
      const { spec, parentPath } = mustGet(
        plan.chainSpecs,
        path,
        `chain spec "${path}"`,
      )
      const [pf, tf] = singlePair(
        spec,
        parentPath
          ? mustGet(plan.chainSpecs, parentPath, `chain spec "${parentPath}"`)
              .spec.from
          : model,
        pkOf,
        "relation filters",
      )
      const target = collections[spec.from]
      if (!target)
        throw new Error(`create-lofi: unknown collection "${spec.from}".`)
      const parentRef = parentPath
        ? mustGet(plan.chainAliases, parentPath, `chain alias "${parentPath}"`)
        : "row"
      query = query.leftJoin({ [alias]: target }, (t: Refs) =>
        eq(t[parentRef][pf], t[alias][tf]),
      )
    }

    // quantifier / required filter joins
    for (const [, { alias, subquery, parentField }] of plan.filterJoins) {
      query = query.leftJoin({ [alias]: subquery }, (t: Refs) =>
        eq(t.row[parentField], t[alias].__k),
      )
    }

    // where
    const hasWhere = a.where !== undefined && Object.keys(a.where).length > 0
    if (hasWhere || requiredPreds.length > 0) {
      query = query.where((t: Refs) => {
        const clauses: Array<Expr> = requiredPreds.map((p) => p(t))
        if (hasWhere) {
          const compiled = compileTopWhere(
            plan,
            includeTree,
            t,
            t.row,
            a.where as Record<string, unknown>,
            "",
          )
          if (compiled !== undefined) clauses.push(compiled)
        }
        if (clauses.length === 0) return eq(1 as Expr, 1 as Expr)
        return allOf(clauses)
      })
    }

    // orderBy
    let ordered = false
    for (const { path, field, sort, nulls } of orderEntries) {
      const ref = path
        ? mustGet(
            plan.chainAliases,
            path.join("."),
            `chain alias "${path.join(".")}"`,
          )
        : null
      query = query.orderBy((t: Refs) => (ref ? t[ref][field] : t.row[field]), {
        direction: sort,
        nulls,
      })
      ordered = true
    }
    if (!ordered && (a.take !== undefined || a.skip !== undefined)) {
      // nulls: 'first' — PKs are never null, and 'first' matches
      // DEFAULT_COMPARE_OPTIONS so findIndexForField can use the pk index
      // for the orderBy+limit lazy-loading optimization. With 'last', the
      // compare options deep-equality check fails against any index created
      // without explicit compareOptions and TanStack falls back to loading
      // all data (warning: `orderBy with limit requires an index on "id"`).
      query = query.orderBy((t: Refs) => t.row[pkOf(model)], {
        direction: "asc",
        nulls: "first",
      })
    }

    if (a.skip !== undefined) query = query.offset(a.skip)
    if (a.take !== undefined) query = query.limit(a.take)

    // output stage — Prisma-style top-level distinct needs no engine changes:
    // rows compile through the normal select/include path and the memoized
    // post-transform dedups keep-first per combo (engine order preserved).
    const emitted = Object.entries(includeTree ?? {}).filter(
      ([, s]) => s.emit !== false,
    )
    const needsSelect =
      a.select !== undefined ||
      emitted.length > 0 ||
      plan.chainAliases.size > 0 ||
      plan.filterJoins.size > 0
    if (needsSelect) {
      query = query.select((t: Refs) => {
        const out: Record<string, Expr> = a.select
          ? Object.fromEntries(a.select.map((f) => [f, t.row[f]]))
          : { ...t.row }
        for (const [label, spec] of emitted) {
          out[label] = buildIncludeOutput(plan, t, spec, model)
        }
        return out
      })
    }

    return query
  }

  // --- post-transform: per-include distinct dedupe (engine bug workaround)
  // + Prisma-style top-level distinct (keep-first per combo, engine-ordered) --
  const transform = buildDistinctTransform(includeTree, topDistinct)
  return { queryFn, transform }
}

export function buildDistinctTransform(
  includeTree: AnyIncludeMap | undefined,
  topDistinct: Array<{ label: string | null; field: string }> | null = null,
): ((rows: Array<Expr>) => Array<Expr>) | null {
  type Op = { label: string; fields: Array<string>; nested: Array<Op> }
  const collect = (tree: AnyIncludeMap): Array<Op> => {
    const ops: Array<Op> = []
    for (const [label, spec] of Object.entries(tree)) {
      if (spec.emit === false) continue
      const nested = spec.include ? collect(spec.include) : []
      const fields = spec.distinct
        ? typeof spec.distinct === "string"
          ? [spec.distinct]
          : [...spec.distinct]
        : []
      if (fields.length > 0 || nested.length > 0)
        ops.push({ label, fields, nested })
    }
    return ops
  }
  const ops = includeTree ? collect(includeTree) : []
  if (ops.length === 0 && !topDistinct) return null

  const apply = (rows: Array<Expr>, ops: Array<Op>): Array<Expr> =>
    rows.map((row) => {
      let changed = false
      const next = { ...row }
      for (const op of ops) {
        const v = row[op.label]
        if (Array.isArray(v)) {
          let arr = v
          if (op.nested.length > 0) arr = apply(arr, op.nested)
          if (op.fields.length > 0) {
            const seen = new Set<string>()
            arr = arr.filter((item) => {
              const key = JSON.stringify(op.fields.map((f) => item?.[f]))
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
          }
          next[op.label] = arr
          changed = true
        } else if (v && op.nested.length > 0) {
          next[op.label] = apply([v], op.nested)[0]
          changed = true
        }
      }
      return changed ? next : row
    })

  // Top-level Prisma-style distinct: keep the FIRST row per unique combo.
  // Rows arrive engine-ordered, so keep-first honors the query's orderBy.
  const dedupeTop = (rows: Array<Expr>): Array<Expr> => {
    if (!topDistinct) return rows
    const seen = new Set<string>()
    return rows.filter((row) => {
      const key = JSON.stringify(
        topDistinct.map(({ label, field }) =>
          label ? row?.[label]?.[field] : row?.[field],
        ),
      )
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return (rows) => dedupeTop(ops.length > 0 ? apply(rows, ops) : rows)
}

/* ================================================================== */
/* Misc                                                               */
/* ================================================================== */

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value) ?? "undefined"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const keys = Object.keys(value as object).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`
}

/* ================================================================== */
/* Public factory                                                     */
/* ================================================================== */

/** Args for useFindFirst (first match of a filter). */
export type FindFirstArgs<
  C extends Collections,
  K extends keyof C,
  I extends IncludeMap<C, RowOf<C, K>> = Empty,
  S extends ReadonlyArray<keyof RowOf<C, K> & string> | undefined = undefined,
> = Omit<
  FindManyArgs<C, K, I, S, undefined>,
  "take" | "distinct" | "placeholderData"
> & {
  placeholderData?: NoInfer<FindManyResult<C, K, I, S, undefined>>
}

/** Args for useFindUnique (unique lookup — no filtering clauses). */
export type FindUniqueArgs<
  C extends Collections,
  K extends keyof C,
  I extends IncludeMap<C, RowOf<C, K>> = Empty,
  S extends ReadonlyArray<keyof RowOf<C, K> & string> | undefined = undefined,
> = Omit<
  FindManyArgs<C, K, I, S, undefined>,
  "take" | "skip" | "where" | "distinct" | "orderBy" | "placeholderData"
> & {
  placeholderData?: NoInfer<FindManyResult<C, K, I, S, undefined>>
}

export type EntityKey = string | number

/**
 * Resolve useFindUnique's key into useFindFirst args. Pure — exported for
 * non-React use and tests.
 * A null/undefined/false key resolves to enabled: false, so the hook stays
 * mounted (loading-parent / gating pattern) while carrying any
 * placeholderData.
 */
export function resolveUniqueArgs(
  model: string,
  key: EntityKey | null | undefined | false,
  args: Record<string, unknown> | undefined,
  options: CreateLofiOptions<Collections> | undefined,
): Record<string, unknown> {
  if (key === null || key === undefined || key === false) {
    return { ...args, enabled: false }
  }
  const pk = options?.primaryKeys?.[model] ?? "id"
  return { ...args, where: { [pk]: key } }
}

/**
 * Pure control-plane split of an args value. Exported for tests.
 * - skipped: args === false or args.enabled === false
 * - hashKey: query identity — excludes placeholderData (SSR payload changes
 *   must not recompile), includes enabled (toggling must resubscribe)
 * - compileArgs: what compileFindMany sees — no control keys
 */
export function prepareArgs(
  args: Record<string, unknown> | false | undefined,
): {
  skipped: boolean
  hashKey: string
  compileArgs: Record<string, unknown> | undefined
  placeholderData: unknown
} {
  if (args === false) {
    return {
      skipped: true,
      hashKey: "false",
      compileArgs: undefined,
      placeholderData: undefined,
    }
  }
  if (args === undefined || args === null) {
    return {
      skipped: false,
      hashKey: "none",
      compileArgs: undefined,
      placeholderData: undefined,
    }
  }
  const { enabled, placeholderData, ...rest } = args as {
    enabled?: boolean
    placeholderData?: unknown
  } & Record<string, unknown>
  return {
    skipped: enabled === false,
    hashKey: stableStringify({ ...rest, enabled }),
    compileArgs: rest,
    placeholderData,
  }
}

// The options param is `O & CreateLofiOptions<C>`, not just `O`: while O is
// being inferred from a literal mid-typing, its contextual type collapses and
// IntelliSense offers nothing (same phenomenon ValidateIncludeMap works
// around). Intersecting with the concrete CreateLofiOptions<C> keeps key and
// value completions alive at every level, while O still captures the exact
// mutation-default keys that drive InsertData's optionality.
export function createLofi<
  C extends Collections,
  const O extends CreateLofiOptions<C> = Empty,
>(collections: C, options?: O & CreateLofiOptions<C>) {
  function useFindMany<
    K extends keyof C & string,
    const I extends IncludeMap<C, RowOf<C, K>> = Empty,
    const S extends
      | ReadonlyArray<keyof RowOf<C, K> & string>
      | undefined = undefined,
    const D extends
      | ReadonlyArray<DistinctEntry<C, K, I>>
      | undefined = undefined,
  >(
    model: K,
    args?: FindManyArgs<C, K, I, S, D> | false,
  ): {
    data: Array<FindManyResult<C, K, I, S, D>> | undefined
    /**
     * Row count BEFORE the distinct post-transform (the engine window).
     * With `distinct` + `take`, pages can dedupe to fewer than `take` rows —
     * `rawCount < take` means the window itself wasn't filled, i.e. the data
     * is exhausted; `rawCount === take` means widening `take` may surface
     * more distinct rows. undefined while loading/disabled.
     */
    rawCount: number | undefined
  } & LiveQueryExtras {
    const { skipped, hashKey, compileArgs, placeholderData } = prepareArgs(
      args as Record<string, unknown> | false | undefined,
    )
    // biome-ignore lint/correctness/useExhaustiveDependencies: query identity is intentionally the serialized args (collections/options are factory-stable)
    const compiled = React.useMemo(
      () =>
        skipped
          ? null
          : compileFindMany(collections, model, compileArgs, options),
      [model, hashKey, skipped],
    )
    // A null query keeps the hook mounted with no subscription (disabled state).
    const result = useLiveQuery(
      (q) => (compiled ? compiled.queryFn(q) : null),
      [model, hashKey, skipped],
    )
    const data = React.useMemo(() => {
      if (skipped || !result.isReady) {
        return placeholderData !== undefined ? placeholderData : undefined
      }
      return compiled?.transform && result.data
        ? compiled.transform(result.data as Array<Expr>)
        : result.data
    }, [skipped, compiled, result.isReady, result.data, placeholderData])
    const rawCount =
      skipped || !result.isReady
        ? undefined
        : ((result.data as Array<unknown> | undefined)?.length ?? 0)
    // TanStack Query placeholder semantics: while placeholderData is what
    // `data` returns (and the query hasn't errored), the hook reports
    // SUCCESS — the data is usable now, the live query's pending state is
    // a background revalidation, surfaced via isPlaceholderData instead.
    const isPlaceholderData =
      (skipped || !result.isReady) &&
      placeholderData !== undefined &&
      !result.isError
    const extras = isPlaceholderData
      ? {
          ...result,
          isLoading: false,
          isReady: true,
          status: "ready",
        }
      : result
    return { ...extras, isPlaceholderData, data, rawCount } as unknown as {
      data: Array<FindManyResult<C, K, I, S, D>> | undefined
      rawCount: number | undefined
    } & LiveQueryExtras
  }

  /** First match of a filter (respects where/orderBy/skip). */
  function useFindFirst<
    K extends keyof C & string,
    const I extends IncludeMap<C, RowOf<C, K>> = Empty,
    const S extends
      | ReadonlyArray<keyof RowOf<C, K> & string>
      | undefined = undefined,
  >(
    model: K,
    args?: FindFirstArgs<C, K, I, S> | false,
  ): {
    data: FindManyResult<C, K, I, S, undefined> | undefined
  } & LiveQueryExtras {
    const resolved = (args === false ? { enabled: false } : { ...args }) as {
      placeholderData?: unknown
    } & Record<string, unknown>
    // useFindFirst's placeholderData is a single row; useFindMany speaks arrays.
    const { placeholderData, ...rest } = resolved
    const forwarded =
      placeholderData !== undefined
        ? { ...rest, take: 1, placeholderData: [placeholderData] }
        : { ...rest, take: 1 }
    const { data, ...extras } = useFindMany(
      model,
      forwarded as FindManyArgs<C, K, Empty, undefined, undefined>,
    ) as { data: Array<unknown> | undefined } & LiveQueryExtras
    return { data: data?.[0], ...extras } as {
      data: FindManyResult<C, K, I, S, undefined> | undefined
    } & LiveQueryExtras
  }

  /** Unique lookup by primary key. null/undefined = no match (loading-parent pattern). */
  function useFindUnique<
    K extends keyof C & string,
    const I extends IncludeMap<C, RowOf<C, K>> = Empty,
    const S extends
      | ReadonlyArray<keyof RowOf<C, K> & string>
      | undefined = undefined,
  >(
    model: K,
    key: EntityKey | null | undefined | false,
    args?: FindUniqueArgs<C, K, I, S>,
  ): {
    data: FindManyResult<C, K, I, S, undefined> | undefined
  } & LiveQueryExtras {
    const resolved = resolveUniqueArgs(
      model,
      key,
      args as Record<string, unknown> | undefined,
      options,
    )
    return useFindFirst(model, resolved as FindFirstArgs<C, K, I, S>)
  }

  /* ---------------------------- mutations --------------------------- */
  // Typed pass-throughs to the collection write API. These create TanStack DB
  // optimistic transactions — persistence requires onInsert/onUpdate/onDelete
  // handlers on the underlying collection.

  function collectionOf(model: keyof C & string): AnyCollection {
    const c = collections[model]
    if (!c)
      throw new Error(
        `create-lofi: unknown collection "${model}". Known: ${Object.keys(collections).join(", ")}`,
      )
    return c
  }

  /**
   * Merge `$all` + per-collection defaults for one write and evaluate
   * thunks (once per call — batch inserts share a timestamp). `$all`
   * entries apply only to fields the entity can write, advertised by the
   * collection's writableFields util (id + attrs + link columns).
   */
  function resolveDefaults(
    scope: Record<string, unknown> | undefined,
    model: keyof C & string,
  ): Record<string, unknown> | null {
    const shared = scope?.$all as Record<string, unknown> | undefined
    const own = scope?.[model] as Record<string, unknown> | undefined
    if (!shared && !own) return null
    const writable = (
      collectionOf(model) as unknown as {
        utils?: { writableFields?: Set<string> }
      }
    ).utils?.writableFields
    const out: Record<string, unknown> = {}
    const apply = (
      defs: Record<string, unknown> | undefined,
      filterWritable: boolean,
    ) => {
      if (!defs) return
      for (const [field, v] of Object.entries(defs)) {
        if (v === undefined) continue
        if (filterWritable && writable && !writable.has(field)) continue
        out[field] = typeof v === "function" ? (v as () => unknown)() : v
      }
    }
    apply(shared, true)
    apply(own, false)
    return Object.keys(out).length > 0 ? out : null
  }

  function insertItem<K extends keyof C & string>(
    model: K,
    data: InsertData<C, K, O> | Array<InsertData<C, K, O>>,
  ) {
    const defaults = resolveDefaults(
      options?.mutationDefaults?.insert as Record<string, unknown> | undefined,
      model,
    )
    const fill = (row: InsertData<C, K, O>): Record<string, unknown> => {
      const out = { ...(row as Record<string, unknown>) }
      if (defaults)
        for (const [field, v] of Object.entries(defaults))
          if (out[field] === undefined) out[field] = v
      return out
    }
    return collectionOf(model).insert(
      Array.isArray(data) ? data.map(fill) : fill(data),
    )
  }

  /** Update one item by primary key: a partial patch or a draft mutator. */
  function updateItem<K extends keyof C & string>(
    model: K,
    key: EntityKey,
    changes:
      | Partial<NullClearable<WriteRowOf<C, K>>>
      | ((draft: RowOf<C, K>) => void),
  ) {
    const defaults = resolveDefaults(
      options?.mutationDefaults?.update as Record<string, unknown> | undefined,
      model,
    )
    return collectionOf(model).update(key, (draft: RowOf<C, K>) => {
      if (defaults) Object.assign(draft as object, defaults)
      if (typeof changes === "function") changes(draft)
      else Object.assign(draft as object, changes)
    })
  }

  function deleteItem<K extends keyof C & string>(
    model: K,
    key: EntityKey | Array<EntityKey>,
  ) {
    return collectionOf(model).delete(key)
  }

  return {
    useFindMany,
    useFindFirst,
    useFindUnique,
    insertItem,
    updateItem,
    deleteItem,
  }
}
