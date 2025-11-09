import { Effect, Either, PrimaryKey, Schema } from "effect"
import * as Activity from "~/Activity"
import * as Playwright from "~/Playwright"

export class RequestError extends Schema.TaggedError<RequestError>(
  "ActivityScraper/RequestError"
)("RequestError", {
  message: Schema.String,
}) {}

export class ActivitiesResult extends Schema.Class<ActivitiesResult>(
  "ActivitiesResult"
)({
  activities: Activity.Activities,
  failedCount: Schema.Number,
}) {}

const URLString = Schema.String.pipe(
  Schema.filter((a) => Either.try(() => new URL(a)).pipe(Either.isRight), {
    identifier: "URLString",
    description: "a valid URL string",
  })
)

export class Request extends Schema.TaggedRequest<Request>()(
  "ActivityScraper/Request",
  {
    failure: RequestError,
    success: ActivitiesResult,
    payload: {
      url: URLString,
    },
  }
) {
  [PrimaryKey.symbol]() {
    return this.url
  }
}

export class ActivityScraper extends Effect.Service<ActivityScraper>()(
  "ActivityScraper",
  {
    effect: Effect.gen(function* () {
      const get = Effect.fn("get")(function* (url: string) {
        yield* Effect.annotateCurrentSpan({ url })

        const page = yield* Playwright.Page

        const resultStr = yield* Effect.tryPromise(async () => {
          const msgPromise = page.waitForEvent("console", {
            predicate: (msg) =>
              msg.text().startsWith("[OcActivitySearch.search()] result="),
          })
          await page.goto(url)
          const msg = await msgPromise
          const result = msg
            .text()
            .replace("[OcActivitySearch.search()] result=", "")
          return result
        })

        // Parse as raw array first
        const rawArraySchema = Schema.parseJson(Schema.Array(Schema.Unknown))
        const rawArray = yield* Schema.decodeUnknown(rawArraySchema)(resultStr)

        // Validate each activity individually
        const activities: Activity.Activity[] = []
        let failedCount = 0

        for (const item of rawArray) {
          const decodeItem = Schema.decodeUnknown(Activity.Activity)
          const either = yield* decodeItem(item).pipe(Effect.either)
          
          if (Either.isLeft(either)) {
            failedCount++
            yield* Effect.log("Failed to parse activity").pipe(
              Effect.flatMap(() =>
                Effect.logError("Parse error", Either.getLeft(either)),
              ),
            )
          } else {
            activities.push(either.right)
          }
        }

        return new ActivitiesResult({ activities, failedCount })
      }, Effect.provide(Playwright.Page.Live))

      return get
    }),
  }
) {}
