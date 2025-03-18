import { FileSystem } from "@effect/platform"
import { NodeRuntime, NodeContext } from "@effect/platform-node"
import { Effect, Schema } from "effect"

import { env } from "~/env"
import * as Activity from "~/Activity"
import * as FileSystemCache from "~/FileSystemCache"
import * as Playwright from "~/Playwright"

const URL_AMC =
  "https://activities.outdoors.org/s/?chapters=0015000001Sg069AAB&audiences=20%E2%80%99s+%26+30%E2%80%99s"

const cacheSchema = Schema.parseJson(Schema.Array(Activity.Activity))

const getActivitiesCached = Effect.gen(function* () {
  const page = yield* Playwright.Page

  const resultStr = yield* Effect.tryPromise(async () => {
    const msgPromise = page.waitForEvent("console", {
      predicate: (msg) =>
        msg.text().startsWith("[OcActivitySearch.search()] result="),
    })
    await page.goto(URL_AMC)
    const msg = await msgPromise
    const result = msg.text().replace("[OcActivitySearch.search()] result=", "")
    return result
  })

  return yield* Schema.decode(cacheSchema)(resultStr)
}).pipe(
  Effect.provide(Playwright.Page.Live),
  FileSystemCache.cached({
    file: "./ignore/cache.txt",
    schema: cacheSchema,
  })
)

const program = Effect.gen(function* () {
  const activities = yield* getActivitiesCached

  const leader = activities.at(0)?.OC_Trip_Leaders__r.at(0)

  console.log(leader?.Contact__r.Name)
})

program.pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
