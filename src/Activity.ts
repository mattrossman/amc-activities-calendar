import { Schema } from "effect"

export class Activity extends Schema.Class<Activity>("Activity")({
  Id: Schema.String,
  Activity_Name__c: Schema.String,
  Audience_Type__c: Schema.String,
  Main_Activity_Difficulty_Rating__c: Schema.String,
  End_Date__c: Schema.DateTimeUtc,
  Start_Date__c: Schema.DateTimeUtc,
}) {}

export const parseJson = Schema.parseJson(Activity).pipe(Schema.decodeUnknown)
export const parseJsonArray = Schema.parseJson(Schema.Array(Activity)).pipe(
  Schema.decodeUnknown
)
