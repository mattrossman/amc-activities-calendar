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
    options: CachedKeyValueStoreOptions<A, I>
  ): Effect.Effect<
    A,
    E | PlatformCacheError,
    R | KeyValueStore.KeyValueStore
  > => {
    const effect = Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore

      const encode = Schema.parseJson(options.schema).pipe(Schema.encode)

      const decode = Schema.parseJson(options.schema).pipe(Schema.decode)

      const encodeAndWrite = (result: A) =>
        encode(result).pipe(
          Effect.tap(() => options.onCacheMiss?.()),
          Effect.andThen((str) => kv.set(options.key, str))
        )

      const result = yield* kv.get(options.key).pipe(
        Effect.flatten,
        Effect.flatMap(decode),
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
