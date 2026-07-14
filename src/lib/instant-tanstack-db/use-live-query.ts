import type {
  Collection,
  CollectionStatus,
  Context,
  GetResult,
  InferResultType,
  InitialQueryBuilder,
  LiveQueryCollectionConfig,
  NonSingleResult,
  QueryBuilder,
  SingleResult,
} from "@tanstack/db"
import {
  BaseQueryBuilder,
  CollectionImpl,
  createLiveQueryCollection,
} from "@tanstack/db"
import { useHydrated } from "@tanstack/react-router"
import { useRef, useSyncExternalStore } from "react"

const DEFAULT_GC_TIME_MS = 1 // Live queries created by useLiveQuery are cleaned up immediately (0 disables GC)

// biome-ignore lint/suspicious/noExplicitAny: matches upstream's untyped utils record in the published overloads
type AnyUtils = Record<string, any>
// biome-ignore lint/complexity/noBannedTypes: matches upstream's empty utils generic ({} has keyof = never)
type EmptyUtils = {}

export type UseLiveQueryStatus = CollectionStatus | `disabled`

/**
 * Create a live query using a query function
 * @param queryFn - Query function that defines what data to fetch
 * @param deps - Array of dependencies that trigger query re-execution when changed
 * @returns Object with reactive data, state, and status information
 * @example
 * // Basic query with object syntax
 * const { data, isLoading } = useLiveQuery((q) =>
 *   q.from({ todos: todosCollection })
 *    .where(({ todos }) => eq(todos.completed, false))
 *    .select(({ todos }) => ({ id: todos.id, text: todos.text }))
 * )
 *
 *  @example
 * // Single result query
 * const { data } = useLiveQuery(
 *   (q) => q.from({ todos: todosCollection })
 *          .where(({ todos }) => eq(todos.id, 1))
 *          .findOne()
 * )
 *
 * @example
 * // With dependencies that trigger re-execution
 * const { data, state } = useLiveQuery(
 *   (q) => q.from({ todos: todosCollection })
 *          .where(({ todos }) => gt(todos.priority, minPriority)),
 *   [minPriority] // Re-run when minPriority changes
 * )
 *
 * @example
 * // Join pattern
 * const { data } = useLiveQuery((q) =>
 *   q.from({ issues: issueCollection })
 *    .join({ persons: personCollection }, ({ issues, persons }) =>
 *      eq(issues.userId, persons.id)
 *    )
 *    .select(({ issues, persons }) => ({
 *      id: issues.id,
 *      title: issues.title,
 *      userName: persons.name
 *    }))
 * )
 *
 * @example
 * // Handle loading and error states
 * const { data, isLoading, isError, status } = useLiveQuery((q) =>
 *   q.from({ todos: todoCollection })
 * )
 *
 * if (isLoading) return <div>Loading...</div>
 * if (isError) return <div>Error: {status}</div>
 *
 * return (
 *   <ul>
 *     {data.map(todo => <li key={todo.id}>{todo.text}</li>)}
 *   </ul>
 * )
 */
// Overload 1: Accept query function that always returns QueryBuilder
export function useLiveQuery<TContext extends Context>(
  queryFn: (q: InitialQueryBuilder) => QueryBuilder<TContext>,
  deps?: Array<unknown>,
): {
  state: Map<string | number, GetResult<TContext>> | undefined
  data: InferResultType<TContext> | undefined
  collection:
    | Collection<GetResult<TContext>, string | number, EmptyUtils>
    | undefined
  status: CollectionStatus // Can't be disabled if always returns QueryBuilder
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean // false before hydration, true afterwards
}

// Overload 2: Accept query function that can return undefined/null
export function useLiveQuery<TContext extends Context>(
  queryFn: (
    q: InitialQueryBuilder,
  ) => QueryBuilder<TContext> | undefined | null,
  deps?: Array<unknown>,
): {
  state: Map<string | number, GetResult<TContext>> | undefined
  data: InferResultType<TContext> | undefined
  collection:
    | Collection<GetResult<TContext>, string | number, EmptyUtils>
    | undefined
  status: UseLiveQueryStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean
}

// Overload 3: Accept query function that can return LiveQueryCollectionConfig
export function useLiveQuery<TContext extends Context>(
  queryFn: (
    q: InitialQueryBuilder,
  ) => LiveQueryCollectionConfig<TContext> | undefined | null,
  deps?: Array<unknown>,
): {
  state: Map<string | number, GetResult<TContext>> | undefined
  data: InferResultType<TContext> | undefined
  collection:
    | Collection<GetResult<TContext>, string | number, EmptyUtils>
    | undefined
  status: UseLiveQueryStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean
}

// Overload 4: Accept query function that can return Collection
export function useLiveQuery<
  TResult extends object,
  TKey extends string | number,
  TUtils extends AnyUtils,
>(
  queryFn: (
    q: InitialQueryBuilder,
  ) => Collection<TResult, TKey, TUtils> | undefined | null,
  deps?: Array<unknown>,
): {
  state: Map<TKey, TResult> | undefined
  data: Array<TResult> | undefined
  collection: Collection<TResult, TKey, TUtils> | undefined
  status: UseLiveQueryStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean
}

// Overload 5: Accept query function that can return all types
export function useLiveQuery<
  TContext extends Context,
  TResult extends object,
  TKey extends string | number,
  TUtils extends AnyUtils,
>(
  queryFn: (
    q: InitialQueryBuilder,
  ) =>
    | QueryBuilder<TContext>
    | LiveQueryCollectionConfig<TContext>
    | Collection<TResult, TKey, TUtils>
    | undefined
    | null,
  deps?: Array<unknown>,
): {
  state:
    | Map<string | number, GetResult<TContext>>
    | Map<TKey, TResult>
    | undefined
  data: InferResultType<TContext> | Array<TResult> | undefined
  collection:
    | Collection<GetResult<TContext>, string | number, EmptyUtils>
    | Collection<TResult, TKey, TUtils>
    | undefined
  status: UseLiveQueryStatus
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean
}

/**
 * Create a live query using configuration object
 * @param config - Configuration object with query and options
 * @param deps - Array of dependencies that trigger query re-execution when changed
 * @returns Object with reactive data, state, and status information
 * @example
 * // Basic config object usage
 * const { data, status } = useLiveQuery({
 *   query: (q) => q.from({ todos: todosCollection }),
 *   gcTime: 60000
 * })
 *
 * @example
 * // With query builder and options
 * const queryBuilder = new Query()
 *   .from({ persons: collection })
 *   .where(({ persons }) => gt(persons.age, 30))
 *   .select(({ persons }) => ({ id: persons.id, name: persons.name }))
 *
 * const { data, isReady } = useLiveQuery({ query: queryBuilder })
 *
 * @example
 * // Handle all states uniformly
 * const { data, isLoading, isReady, isError } = useLiveQuery({
 *   query: (q) => q.from({ items: itemCollection })
 * })
 *
 * if (isLoading) return <div>Loading...</div>
 * if (isError) return <div>Something went wrong</div>
 * if (!isReady) return <div>Preparing...</div>
 *
 * return <div>{data.length} items loaded</div>
 */
// Overload 6: Accept config object
export function useLiveQuery<TContext extends Context>(
  config: LiveQueryCollectionConfig<TContext>,
  deps?: Array<unknown>,
): {
  state: Map<string | number, GetResult<TContext>> | undefined
  data: InferResultType<TContext> | undefined
  collection:
    | Collection<GetResult<TContext>, string | number, EmptyUtils>
    | undefined
  status: CollectionStatus // Can't be disabled for config objects
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean // false before hydration, true afterwards
}

/**
 * Subscribe to an existing live query collection
 * @param liveQueryCollection - Pre-created live query collection to subscribe to
 * @returns Object with reactive data, state, and status information
 * @example
 * // Using pre-created live query collection
 * const myLiveQuery = createLiveQueryCollection((q) =>
 *   q.from({ todos: todosCollection }).where(({ todos }) => eq(todos.active, true))
 * )
 * const { data, collection } = useLiveQuery(myLiveQuery)
 *
 * @example
 * // Access collection methods directly
 * const { data, collection, isReady } = useLiveQuery(existingCollection)
 *
 * // Use collection for mutations
 * const handleToggle = (id) => {
 *   collection.update(id, draft => { draft.completed = !draft.completed })
 * }
 *
 * @example
 * // Handle states consistently
 * const { data, isLoading, isError } = useLiveQuery(sharedCollection)
 *
 * if (isLoading) return <div>Loading...</div>
 * if (isError) return <div>Error loading data</div>
 *
 * return <div>{data.map(item => <Item key={item.id} {...item} />)}</div>
 */
// Overload 7: Accept pre-created live query collection
export function useLiveQuery<
  TResult extends object,
  TKey extends string | number,
  TUtils extends AnyUtils,
>(
  liveQueryCollection: Collection<TResult, TKey, TUtils> & NonSingleResult,
): {
  state: Map<TKey, TResult> | undefined
  data: Array<TResult> | undefined
  collection: Collection<TResult, TKey, TUtils> | undefined
  status: CollectionStatus // Can't be disabled for pre-created live query collections
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean // false before hydration, true afterwards
}

// Overload 8: Accept pre-created live query collection with singleResult: true
export function useLiveQuery<
  TResult extends object,
  TKey extends string | number,
  TUtils extends AnyUtils,
>(
  liveQueryCollection: Collection<TResult, TKey, TUtils> & SingleResult,
): {
  state: Map<TKey, TResult> | undefined
  data: TResult | undefined
  collection: (Collection<TResult, TKey, TUtils> & SingleResult) | undefined
  status: CollectionStatus // Can't be disabled for pre-created live query collections
  isLoading: boolean
  isReady: boolean
  isIdle: boolean
  isError: boolean
  isCleanedUp: boolean
  isEnabled: boolean // false before hydration, true afterwards
}

// Implementation - use function overloads to infer the actual collection type
export function useLiveQuery(
  // biome-ignore lint/suspicious/noExplicitAny: implementation signature is loose; the public overloads carry the types
  configOrQueryOrCollection: any,
  deps: Array<unknown> = [],
) {
  // Hydration guard: during SSR and the initial hydration render, don't
  // create, start, or subscribe to any live query collection. useHydrated
  // returns false on the server and on the first client render (so markup
  // matches), then flips to true after hydration — at which point the
  // collection is created and sync starts.
  const hydrated = useHydrated()

  // Check if it's already a collection (duck-typed, matching the published
  // @tanstack/react-db implementation — there is no isCollection export yet)
  const inputIsCollection =
    configOrQueryOrCollection &&
    typeof configOrQueryOrCollection === `object` &&
    typeof configOrQueryOrCollection.subscribeChanges === `function` &&
    typeof configOrQueryOrCollection.startSyncImmediate === `function` &&
    typeof configOrQueryOrCollection.id === `string`

  // Use refs to cache collection and track dependencies
  const collectionRef = useRef<Collection<
    object,
    string | number,
    EmptyUtils
  > | null>(null)
  const depsRef = useRef<Array<unknown> | null>(null)
  const configRef = useRef<unknown>(null)
  const hydratedRef = useRef<boolean | null>(null)

  // Use refs to track version and memoized snapshot
  const versionRef = useRef(0)
  const snapshotRef = useRef<{
    collection: Collection<object, string | number, EmptyUtils> | null
    version: number
  } | null>(null)

  // Check if we need to create/recreate the collection
  const needsNewCollection =
    hydratedRef.current !== hydrated ||
    !collectionRef.current ||
    (inputIsCollection && configRef.current !== configOrQueryOrCollection) ||
    (!inputIsCollection &&
      (depsRef.current === null ||
        depsRef.current.length !== deps.length ||
        depsRef.current.some((dep, i) => dep !== deps[i])))

  hydratedRef.current = hydrated

  if (needsNewCollection && !hydrated) {
    // Before hydration, never create or subscribe to a collection — behave
    // like a disabled query so server and first-client renders match.
    collectionRef.current = null
    configRef.current = null
    depsRef.current = inputIsCollection ? null : [...deps]
  } else if (needsNewCollection) {
    if (inputIsCollection) {
      // Warn when passing a collection directly with on-demand sync mode
      // In on-demand mode, data is only loaded when queries with predicates request it
      // Passing the collection directly doesn't provide any predicates, so no data loads
      const syncMode = (
        configOrQueryOrCollection as { config?: { syncMode?: string } }
      ).config?.syncMode
      if (syncMode === `on-demand`) {
        console.warn(
          `[useLiveQuery] Warning: Passing a collection with syncMode "on-demand" directly to useLiveQuery ` +
            `will not load any data. In on-demand mode, data is only loaded when queries with predicates request it.\n\n` +
            `Instead, use a query builder function:\n` +
            `  const { data } = useLiveQuery((q) => q.from({ c: myCollection }).select(({ c }) => c))\n\n` +
            `Or switch to syncMode "eager" if you want all data to sync automatically.`,
        )
      }
      // It's already a collection, ensure sync is started for React hooks
      configOrQueryOrCollection.startSyncImmediate()
      collectionRef.current = configOrQueryOrCollection
      configRef.current = configOrQueryOrCollection
    } else {
      // Handle different callback return types
      if (typeof configOrQueryOrCollection === `function`) {
        // Call the function with a query builder to see what it returns
        const queryBuilder = new BaseQueryBuilder() as InitialQueryBuilder
        const result = configOrQueryOrCollection(queryBuilder)

        if (result === undefined || result === null) {
          // Callback returned undefined/null - disabled query
          collectionRef.current = null
        } else if (result instanceof CollectionImpl) {
          // Callback returned a Collection instance - use it directly
          result.startSyncImmediate()
          collectionRef.current = result
        } else if (result instanceof BaseQueryBuilder) {
          // Callback returned QueryBuilder - create live query collection using the original callback
          // (not the result, since the result might be from a different query builder instance)
          collectionRef.current = createLiveQueryCollection({
            query: configOrQueryOrCollection,
            startSync: true,
            gcTime: DEFAULT_GC_TIME_MS,
          })
        } else if (result && typeof result === `object`) {
          // Assume it's a LiveQueryCollectionConfig
          collectionRef.current = createLiveQueryCollection({
            startSync: true,
            gcTime: DEFAULT_GC_TIME_MS,
            ...result,
          })
        } else {
          // Unexpected return type
          throw new Error(
            `useLiveQuery callback must return a QueryBuilder, LiveQueryCollectionConfig, Collection, undefined, or null. Got: ${typeof result}`,
          )
        }
        depsRef.current = [...deps]
      } else {
        // Original logic for config objects
        collectionRef.current = createLiveQueryCollection({
          startSync: true,
          gcTime: DEFAULT_GC_TIME_MS,
          ...configOrQueryOrCollection,
        })
        depsRef.current = [...deps]
      }
    }
  }

  // Reset refs when collection changes
  if (needsNewCollection) {
    versionRef.current = 0
    snapshotRef.current = null
  }

  // Create stable subscribe function using ref
  const subscribeRef = useRef<
    ((onStoreChange: () => void) => () => void) | null
  >(null)
  if (!subscribeRef.current || needsNewCollection) {
    subscribeRef.current = (onStoreChange: () => void) => {
      // If no collection, return a no-op unsubscribe function
      if (!collectionRef.current) {
        return () => {}
      }

      let unsubscribed = false

      const subscription = collectionRef.current.subscribeChanges(() => {
        // Drop late notifies that race with unsubscribe.
        if (unsubscribed) return
        // Bump version on any change; getSnapshot will rebuild next time
        versionRef.current += 1
        onStoreChange()
      })
      // Already-ready collections won't emit an initial change. Notify React
      // ourselves, but defer to a microtask — calling onStoreChange synchronously
      // here lands during the render-to-commit window and trips React's
      // "state update on a component that hasn't mounted yet" warning.
      if (collectionRef.current.status === `ready`) {
        queueMicrotask(() => {
          if (unsubscribed) return
          versionRef.current += 1
          onStoreChange()
        })
      }
      return () => {
        unsubscribed = true
        subscription.unsubscribe()
      }
    }
  }

  // Create stable getSnapshot function using ref
  const getSnapshotRef = useRef<
    | (() => {
        collection: Collection<object, string | number, EmptyUtils> | null
        version: number
      })
    | null
  >(null)
  if (!getSnapshotRef.current || needsNewCollection) {
    getSnapshotRef.current = () => {
      const currentVersion = versionRef.current
      const currentCollection = collectionRef.current

      // Recreate snapshot object only if version/collection changed
      if (
        !snapshotRef.current ||
        snapshotRef.current.version !== currentVersion ||
        snapshotRef.current.collection !== currentCollection
      ) {
        snapshotRef.current = {
          collection: currentCollection,
          version: currentVersion,
        }
      }

      return snapshotRef.current
    }
  }

  // Use useSyncExternalStore to subscribe to collection changes.
  // The third argument (getServerSnapshot) is required for server rendering —
  // without it React throws "Missing getServerSnapshot" during SSR
  // (see https://github.com/TanStack/db/issues/361). Reusing the same stable
  // getter is safe here because it doesn't touch any browser-only APIs.
  const snapshot = useSyncExternalStore(
    subscribeRef.current,
    getSnapshotRef.current,
    getSnapshotRef.current,
  )

  // Track last snapshot (from useSyncExternalStore) and the returned value separately
  const returnedSnapshotRef = useRef<{
    collection: Collection<object, string | number, EmptyUtils> | null
    version: number
  } | null>(null)
  const returnedHydratedRef = useRef<boolean | null>(null)
  // Keep implementation return loose to satisfy overload signatures
  // biome-ignore lint/suspicious/noExplicitAny: return shape differs per overload; typed by the public signatures
  const returnedRef = useRef<any>(null)

  // Rebuild returned object only when the snapshot changes (version or collection identity)
  if (
    !returnedSnapshotRef.current ||
    returnedSnapshotRef.current.version !== snapshot.version ||
    returnedSnapshotRef.current.collection !== snapshot.collection ||
    returnedHydratedRef.current !== hydrated
  ) {
    if (!hydrated) {
      // Pre-hydration (SSR + first client render): report a loading state so
      // consumers render skeletons; the real query subscribes after hydration.
      returnedRef.current = {
        state: undefined,
        data: undefined,
        collection: undefined,
        status: `loading`,
        isLoading: true,
        isReady: false,
        isIdle: false,
        isError: false,
        isCleanedUp: false,
        isEnabled: false,
      }
    } else if (!snapshot.collection) {
      // Handle null collection case (when callback returns undefined/null)
      returnedRef.current = {
        state: undefined,
        data: undefined,
        collection: undefined,
        status: `disabled`,
        isLoading: false,
        isReady: true,
        isIdle: false,
        isError: false,
        isCleanedUp: false,
        isEnabled: false,
      }
    } else {
      // Capture a stable view of entries for this snapshot to avoid tearing
      const entries = Array.from(snapshot.collection.entries())
      const singleResult = (
        snapshot.collection.config as { singleResult?: boolean }
      ).singleResult
      let stateCache: Map<string | number, unknown> | null = null
      let dataCache: Array<unknown> | null = null

      returnedRef.current = {
        get state() {
          if (!stateCache) {
            stateCache = new Map(entries)
          }
          return stateCache
        },
        get data() {
          if (!dataCache) {
            dataCache = entries.map(([, value]) => value)
          }
          return singleResult ? dataCache[0] : dataCache
        },
        collection: snapshot.collection,
        status: snapshot.collection.status,
        isLoading: snapshot.collection.status === `loading`,
        isReady: snapshot.collection.status === `ready`,
        isIdle: snapshot.collection.status === `idle`,
        isError: snapshot.collection.status === `error`,
        isCleanedUp: snapshot.collection.status === `cleaned-up`,
        isEnabled: true,
      }
    }

    // Remember the snapshot that produced this returned value
    returnedSnapshotRef.current = snapshot
    returnedHydratedRef.current = hydrated
  }

  return returnedRef.current
}
