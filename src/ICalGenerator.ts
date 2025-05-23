import { DateTime, Effect, HashMap } from "effect"
import ical, { type ICalCalendar, type ICalCalendarData } from "ical-generator"
import { DOMParser } from "@xmldom/xmldom"

import type * as Activity from "~/Activity"

const formatLocation = (activity: Activity.Activity) => {
  const lines: string[] = []

  if (activity.Start_Location__c?.street) {
    lines.push(activity.Start_Location__c.street)
  }

  let line2 = ""

  if (activity.Start_Location__c?.city) {
    line2 = activity.Start_Location__c.city
  }

  if (activity.Start_Location__c?.state) {
    line2 = `${line2}, ${activity.Start_Location__c.state}`
  }

  if (activity.Start_Location__c?.postalCode) {
    line2 = `${line2} ${activity.Start_Location__c.postalCode}`
  }

  if (line2.length > 0) {
    lines.push(line2)
  }

  return lines.join("\n")
}

const formatUrl = (activity: Activity.Activity) => {
  return `https://activities.outdoors.org/s/oc-activity/${activity.Id}/`
}

const formatDescription = (activity: Activity.Activity) => {
  const description = new DOMParser().parseFromString(
    `<!DOCTYPE html><html>${activity.Description__c}</html>`,
    "text/html",
  ).documentElement?.textContent

  const start = activity.Start_Concatenation_Formula_Unconverted__c
  const url = formatUrl(activity)

  let result = ""

  result += start
  result += `\n${url}`
  if (description) {
    result += `\n${description}`
  }

  return result
}

export const mergeWithPrevious = Effect.fn("mergeWithPrevious")(
  function* (cal: ICalCalendar, prevIcalString: string) {
    const prevCal = yield* Effect.try(() =>
      ical(JSON.parse(prevIcalString) as ICalCalendarData),
    )

    const entriesPrev = prevCal
      .events()
      .map((event) => [event.id(), event] as const)
    const entries = cal.events().map((event) => [event.id(), event] as const)

    // New events take precedence over old events
    const hashmap = HashMap.empty().pipe(
      HashMap.union(HashMap.fromIterable(entriesPrev)),
      HashMap.union(HashMap.fromIterable(entries)),
    )

    const merged = ical({ events: HashMap.toValues(hashmap) })
    return merged
  },
  (prev, cal) =>
    Effect.catchAllCause(prev, (cause) =>
      Effect.gen(function* () {
        yield* Effect.log("Failed to merge with previous iCal", cause)
        return cal
      }),
    ),
)

export const fromActivities = Effect.fn("fromActivities")(function* (
  activities: typeof Activity.Activities.Type,
) {
  const cal = ical()

  for (const activity of activities) {
    const start = DateTime.toDate(activity.Start_Date__c)
    const location = formatLocation(activity)
    const description = formatDescription(activity)

    cal.createEvent({
      id: activity.Id,
      start,
      allDay: true,
      summary: activity.Activity_Name__c,
      location: location.length > 0 ? location : null,
      description: description && description.length > 0 ? description : null,
    })
  }

  return cal
})

export const withName = (cal: ICalCalendar, name: string) => {
  return ical({ ...cal.toJSON(), name })
}
