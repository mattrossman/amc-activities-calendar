import { NodeRuntime, NodeKeyValueStore } from "@effect/platform-node"
import { Effect, Layer, ManagedRuntime } from "effect"

import * as Activity from "~/Activity"
import * as PlatformCache from "~/PlatformCache"
import * as ActivityScraper from "~/ActivityScraper"

const MainLayer = Layer.mergeAll(
  ActivityScraper.ActivityScraper.Default,
  NodeKeyValueStore.layerFileSystem("./ignore/cache")
)

const program = Effect.gen(function* () {
  const scraper = yield* ActivityScraper.ActivityScraper
  const activities = yield* scraper(ActivityScraper.defaultUrl).pipe(
    PlatformCache.cachedKeyValueStore("activities", Activity.Activities)
  )

  const leader = activities.at(0)?.OC_Trip_Leaders__r.at(0)

  console.log(leader?.Contact__r.Name)
})

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
