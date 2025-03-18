import { KeyValueStore } from "@effect/platform"
import { Effect, Schema, Function, Data } from "effect"

class PlatformCacheError extends Data.TaggedError("PlatformCacheError")<{
  readonly message?: string
  readonly cause?: unknown
}> {}

interface CachedKeyValueStoreOptions<A, I> {
  readonly key: string
  readonly schema: Schema.Schema<A, I>
  readonly onCacheHit?: (result: A) => Effect.Effect<unknown>
  readonly onCacheMiss?: () => Effect.Effect<unknown>
}

export const cachedKeyValueStore: {
  <A, I>(options: CachedKeyValueStoreOptions<A, I>): <E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
  <A, I, E, R>(
    self: Effect.Effect<A, E, R>,
    options: CachedKeyValueStoreOptions<A, I>
  ): Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
} = Function.dual(
  2,
  <A, I, E, R>(
    self: Effect.Effect<A, E, R>,
    { key, schema, onCacheHit, onCacheMiss }: CachedKeyValueStoreOptions<A, I>
  ): Effect.Effect<
    A,
    E | PlatformCacheError,
    R | KeyValueStore.KeyValueStore
  > => {
    return Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore

      const encode = Schema.parseJson(schema).pipe(Schema.encode)
      const decode = Schema.parseJson(schema).pipe(Schema.decode)

      const tryCacheHit = kv.get(key).pipe(
        Effect.flatten,
        Effect.flatMap((encoded) => decode(encoded)),
        Effect.tap((decoded) => onCacheHit?.(decoded))
      )

      const tryCacheMiss = Effect.void.pipe(
        Effect.tap(() => onCacheMiss?.()),
        Effect.andThen(() =>
          self.pipe(
            Effect.tap((res: A) =>
              encode(res).pipe(
                Effect.tap(() => onCacheMiss?.()),
                Effect.andThen((encoded) => kv.set(key, encoded)),
                Effect.catchAll((error) =>
                  Effect.fail(
                    new PlatformCacheError({
                      message: `Failed to cache result to key "${key}"`,
                      cause: error,
                    })
                  )
                )
              )
            )
          )
        )
      )

      return yield* tryCacheHit.pipe(Effect.catchAll(() => tryCacheMiss))
    })
  }
)
