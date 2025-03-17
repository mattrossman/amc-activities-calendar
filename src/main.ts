import { FileSystem } from "@effect/platform"
import { NodeRuntime, NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
import * as Activity from "~/Activity"

import * as Playwright from "~/Playwright"
import { env } from "~/env"

const URL_AMC =
  "https://activities.outdoors.org/s/?chapters=0015000001Sg069AAB&audiences=20%E2%80%99s+%26+30%E2%80%99s"

const program = Effect.gen(function* () {
  console.log("Hello", env.MY_VARIABLE)

  const filesystem = yield* FileSystem.FileSystem

  const page = yield* Playwright.Page

  const result = yield* Effect.tryPromise(async () => {
    const msgPromise = page.waitForEvent("console", {
      predicate: (msg) =>
        msg.text().startsWith("[OcActivitySearch.search()] result="),
    })
    await page.goto(URL_AMC)
    const msg = await msgPromise
    const result = msg.text().replace("[OcActivitySearch.search()] result=", "")
    return result
  })

  const activities = yield* Activity.parseJsonArray(result)

  console.log(activities)

  yield* filesystem.writeFileString("./ignore/response.json", result)
  yield* Effect.log("Wrote response to ./ignore/response.json")
})

program.pipe(
  Effect.provide(NodeContext.layer),
  Effect.provide(Playwright.Page.Live),
  NodeRuntime.runMain
)
