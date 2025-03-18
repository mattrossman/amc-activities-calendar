import { FileSystem } from "@effect/platform"
import {
  NodeRuntime,
  NodeContext,
  NodeKeyValueStore,
} from "@effect/platform-node"
import { Effect, Schema } from "effect"

import { env } from "~/env"
import * as Activity from "~/Activity"
import * as PlatformCache from "~/PlatformCache"
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
  PlatformCache.cachedKeyValueStore({
    key: "activities",
    schema: cacheSchema,
    onCacheHit: () => Effect.log(`Cache hit`),
    onCacheMiss: () => Effect.log(`Cache miss`),
  })
)

const program = Effect.gen(function* () {
  const activities = yield* getActivitiesCached
  const leader = activities.at(0)?.OC_Trip_Leaders__r.at(0)

  console.log(leader?.Contact__r.Name)

  // const Person = Schema.Struct({
  //   name: Schema.String,
  //   age: Schema.Number,
  // })

  // yield* Effect.gen(function*() {
  //   yield* Effect.sleep(1000)
  //   return Person.make({ name: "John", age: 30 })
  // }).pipe(
  //   PlatformCache.cachedKeyValueStore({
  //     key: "person",
  //     schema: Person,
  //   })
  // )
})

program.pipe(
  Effect.provide(NodeKeyValueStore.layerFileSystem("./ignore/cache")),
  NodeRuntime.runMain
)
