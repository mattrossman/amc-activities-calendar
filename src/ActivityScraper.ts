import { Effect, Schema } from "effect"
import * as Activity from "~/Activity"
import * as Playwright from "~/Playwright"

export const defaultUrl =
  "https://activities.outdoors.org/s/?chapters=0015000001Sg069AAB&audiences=20%E2%80%99s+%26+30%E2%80%99s"

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
