import { DateTime, Effect } from "effect"
import ical from "ical-generator"
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

const formatDescription = (activity: Activity.Activity) => {
  const description = new DOMParser().parseFromString(
    `<!DOCTYPE html><html>${activity.Description__c}</html>`,
    "text/html"
  ).documentElement?.textContent

  const start = activity.Start_Concatenation_Formula_Unconverted__c

  let result = start

  if (description) {
    result += `\n${description}`
  }

  return result
}

export const fromActivities = Effect.fn("fromActivities")(function* (
  activities: typeof Activity.Activities.Type
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
