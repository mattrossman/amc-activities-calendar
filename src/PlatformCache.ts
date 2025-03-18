import { KeyValueStore } from "@effect/platform"
import { Effect, Schema, Function, Data } from "effect"

class PlatformCacheError extends Data.TaggedError("PlatformCacheError")<{
  readonly message?: string
  readonly cause?: unknown
}> {}

interface CachedKeyValueStoreOptions<A> {
  readonly key: string
  readonly schema: Schema.Schema<A, string>
  readonly onCacheHit?: (result: A) => Effect.Effect<unknown>
  readonly onCacheMiss?: () => Effect.Effect<unknown>
}

export const cachedKeyValueStore: {
  <A>(options: CachedKeyValueStoreOptions<A>): <E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    options: CachedKeyValueStoreOptions<A>
  ): Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
} = Function.dual(
  2,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    options: CachedKeyValueStoreOptions<A>
  ): Effect.Effect<
    A,
    E | PlatformCacheError,
    R | KeyValueStore.KeyValueStore
  > => {
    const effect = Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore

      const encodeAndWrite = (result: A) =>
        Schema.encode(options.schema)(result).pipe(
          Effect.tap(() => options.onCacheMiss?.()),
          Effect.andThen((str) => kv.set(options.key, str))
        )

      const result = yield* kv.get(options.key).pipe(
        Effect.flatten,
        Effect.flatMap(Schema.decode(options.schema)),
        Effect.tap((res) => options.onCacheHit?.(res)),
        Effect.catchAllCause(() =>
          self.pipe(
            Effect.tap((res) =>
              encodeAndWrite(res).pipe(
                Effect.catchAllCause((cause) =>
                  Effect.fail(
                    new PlatformCacheError({
                      message: `Failed to cache result to key ${options.key}`,
                      cause,
                    })
                  )
                )
              )
            )
          )
        )
      )

      return result
    })

    return effect
  }
)
