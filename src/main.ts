import { NodeRuntime, NodeKeyValueStore } from "@effect/platform-node"
import { Cause, Effect, Layer } from "effect"

import * as ActivityScraper from "~/ActivityScraper"
import { PersistedCache, Persistence } from "@effect/experimental"

const MainLayer = Layer.mergeAll(
  ActivityScraper.ActivityScraper.Default,
  Persistence.layerResultKeyValueStore.pipe(
    Layer.provide(NodeKeyValueStore.layerFileSystem("./ignore/cache"))
  )
)

const makeActivitiesCache = PersistedCache.make({
  storeId: "activities",
  timeToLive: () => "1 day",
  lookup: (req: ActivityScraper.Request) =>
    Effect.gen(function* () {
      console.log("creating thing...")
      const scraper = yield* ActivityScraper.ActivityScraper
      const activities = yield* scraper(req.url)
      return activities
    }).pipe(
      Effect.timeout("5 seconds"),
      Effect.catchAllCause(
        (cause) =>
          new ActivityScraper.RequestError({ message: Cause.pretty(cause) })
      )
    ),
})

const program = Effect.gen(function* () {
  const activitiesCache = yield* makeActivitiesCache
  const activities = yield* activitiesCache.get(
    new ActivityScraper.Request({
      url: ActivityScraper.defaultUrl,
      // url: "https://example.com",
    })
  )

  const leader = activities.at(0)?.OC_Trip_Leaders__r.at(0)

  console.log(leader?.Contact__r.Name)
}).pipe(Effect.scoped)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
