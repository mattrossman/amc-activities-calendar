import {
  NodeRuntime,
  NodeKeyValueStore,
  NodeContext,
} from "@effect/platform-node"
import { NodeSdk } from "@effect/opentelemetry"
import { Cause, Effect, Layer } from "effect"
import { PersistedCache, Persistence } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

import * as ActivityScraper from "~/ActivityScraper"
import * as ICalGenerator from "~/ICalGenerator"

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "effect" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

const MainLayer = Layer.mergeAll(
  ActivityScraper.ActivityScraper.Default,
  ICalGenerator.ICalGenerator.Default,
  NodeContext.layer,
  NodeSdkLive,
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
      url: "https://activities.outdoors.org/s/?chapters=0015000001Sg069AAB&audiences=20%E2%80%99s+%26+30%E2%80%99s",
    })
  )

  const icalGenerator = yield* ICalGenerator.ICalGenerator
  const ical = yield* icalGenerator.fromActivities(activities)

  const path = "./ignore/activities.ics"
  const fs = yield* FileSystem.FileSystem
  yield* fs.writeFileString(path, ical)

  const leader = activities.at(0)?.OC_Trip_Leaders__r.at(0)

  console.log(leader?.Contact__r.Name)
}).pipe(Effect.scoped)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
