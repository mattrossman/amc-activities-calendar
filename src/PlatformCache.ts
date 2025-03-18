import { KeyValueStore } from "@effect/platform"
import { Effect, Schema, Function, Data } from "effect"

class PlatformCacheError extends Data.TaggedError("PlatformCacheError")<{
  readonly message?: string
  readonly cause?: unknown
}> {}

export const cachedKeyValueStore: {
  <A, I>(key: string, schema: Schema.Schema<A, I>): <E, R>(
    self: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
  <A, I, E, R>(
    self: Effect.Effect<A, E, R>,
    key: string,
    schema: Schema.Schema<A, I>
  ): Effect.Effect<A, E | PlatformCacheError, R | KeyValueStore.KeyValueStore>
} = Function.dual(
  3,
  <A, I, E, R>(
    self: Effect.Effect<A, E, R>,
    key: string,
    schema: Schema.Schema<A, I>
  ): Effect.Effect<
    A,
    E | PlatformCacheError,
    R | KeyValueStore.KeyValueStore
  > => {
    return Effect.gen(function* () {
      const kv = yield* KeyValueStore.KeyValueStore

      const encode = Schema.parseJson(schema).pipe(Schema.encode)
      const decode = Schema.parseJson(schema).pipe(Schema.decode)

      const cacheRead = kv.get(key).pipe(
        Effect.flatten,
        Effect.flatMap((encoded) => decode(encoded))
      )

      const cacheWrite = self.pipe(
        Effect.tap((res: A) =>
          encode(res).pipe(
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

      return yield* cacheRead.pipe(Effect.catchAll(() => cacheWrite))
    })
  }
)
