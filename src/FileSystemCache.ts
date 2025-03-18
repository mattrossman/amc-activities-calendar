import { FileSystem } from "@effect/platform"
import { Effect, Schema, Function } from "effect"

/**
 * Example usage:
 *
 * effect.pipe(
 *   FileSystemCache.cached({ file: "./ignore/foo.txt", schema: Schema.String }),
 * )
 */

export const cached: {
  <A>(options: {
    readonly file: string
    readonly schema: Schema.Schema<A, string>
  }): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    options: {
      readonly file: string
      readonly schema: Schema.Schema<A, string>
    }
  ): Effect.Effect<A, E, R>
} = Function.dual(
  2,
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
    options: {
      readonly file: string
      readonly schema: Schema.Schema<A, string>
    }
  ) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem

      const encodeAndWrite = (result: A) =>
        Schema.encode(options.schema)(result).pipe(
          Effect.tap(() => Effect.log(`Caching result to ${options.file}`)),
          Effect.andThen((str) => fs.writeFileString(options.file, str))
        )

      const result = yield* fs.readFileString(options.file).pipe(
        Effect.flatMap(Schema.decode(options.schema)),
        Effect.tap(() => Effect.log(`Read cached result from ${options.file}`)),
        Effect.catchAllCause(() => self.pipe(Effect.tap(encodeAndWrite)))
      )

      return result
    })
)
