import { Effect, Either, PrimaryKey, Schema } from "effect"
import * as Activity from "~/Activity"
import * as Playwright from "~/Playwright"

export class RequestError extends Schema.TaggedError<RequestError>(
  "ActivityScraper/RequestError"
)("RequestError", {
  message: Schema.String,
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
    success: Activity.Activities,
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

        const decode = Schema.parseJson(Activity.Activities).pipe(Schema.decode)

        return yield* decode(resultStr)
      }, Effect.provide(Playwright.Page.Live))

      return get
    }),
  }
) {}
