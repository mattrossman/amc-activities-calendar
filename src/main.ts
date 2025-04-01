import path from "node:path"
import {
  NodeRuntime,
  NodeKeyValueStore,
  NodeContext,
} from "@effect/platform-node"
import { NodeSdk } from "@effect/opentelemetry"
import { Cause, Config, Effect, Layer, Match } from "effect"
import { PersistedCache, Persistence } from "@effect/experimental"
import { FileSystem } from "@effect/platform"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"

import * as ActivityScraper from "~/ActivityScraper"
import * as ICalGenerator from "~/ICalGenerator"

const NODE_ENV = Config.literal(
  "production",
  "development"
)("NODE_ENV").pipe(Config.withDefault("production"))

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: "effect" },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

const ResultPersistenceLive = NODE_ENV.pipe(
  Effect.map((env) =>
    Match.value(env).pipe(
      Match.when("development", () =>
        Persistence.layerResultKeyValueStore.pipe(
          Layer.provide(NodeKeyValueStore.layerFileSystem("./ignore/cache"))
        )
      ),
      Match.when("production", () => Persistence.layerResultMemory),
      Match.exhaustive
    )
  ),
  Layer.unwrapEffect
)

const MainLayer = Layer.mergeAll(
  ActivityScraper.ActivityScraper.Default,
  NodeContext.layer,
  NodeSdkLive,
  ResultPersistenceLive
)

const lookupActivities = Effect.fn("lookupActivities")(
  function* (req: ActivityScraper.Request) {
    const scraper = yield* ActivityScraper.ActivityScraper
    const activities = yield* scraper(req.url)
    return activities
  },
  Effect.timeout("10 seconds"),
  Effect.catchAllCause(
    (cause) =>
      new ActivityScraper.RequestError({ message: Cause.pretty(cause) })
  )
)

const makeActivitiesCacheDev = PersistedCache.make({
  storeId: "activities",
  timeToLive: () => "1 day",
  lookup: lookupActivities,
})

const makeActivitiesCacheProd = PersistedCache.make({
  storeId: "activities",
  timeToLive: () => 0,
  lookup: lookupActivities,
})

const program = Effect.gen(function* () {
  const activitiesCache = yield* NODE_ENV.pipe(
    Effect.flatMap((env) =>
      Match.value(env).pipe(
        Match.when("production", () => makeActivitiesCacheProd),
        Match.when("development", () => makeActivitiesCacheDev),
        Match.exhaustive
      )
    )
  )

  const activities = yield* activitiesCache.get(
    new ActivityScraper.Request({
      url: "https://activities.outdoors.org/s/?chapters=0015000001Sg069AAB&audiences=20%E2%80%99s+%26+30%E2%80%99s",
    })
  )

  const ical = yield* ICalGenerator.fromActivities(activities)

  const fs = yield* FileSystem.FileSystem

  const dir = "./ignore"
  const file = "activities.ics"
  const filePath = path.join(dir, file)

  yield* fs.makeDirectory(dir, { recursive: true }).pipe(
    Effect.matchEffect({
      onSuccess: () => Effect.log(`Created ${dir}`),
      onFailure: (error) => Effect.logError(`Failed to create ${dir}`, error),
    })
  )

  yield* fs.writeFileString(filePath, ical).pipe(
    Effect.matchEffect({
      onSuccess: () => Effect.log(`Wrote ${filePath}`),
      onFailure: (error) =>
        Effect.logError(`Failed to write ${filePath}`, error),
    })
  )
}).pipe(Effect.scoped)

program.pipe(Effect.provide(MainLayer), NodeRuntime.runMain)
