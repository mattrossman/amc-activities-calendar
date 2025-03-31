import { Schema } from "effect"

export class Location extends Schema.Class<Location>("Location")({
  street: Schema.String,
  city: Schema.String,
  state: Schema.String,
  postalCode: Schema.optional(Schema.String),
  country: Schema.String,
  stateCode: Schema.String,
  countryCode: Schema.String,
}) {}

export class Contact extends Schema.Class<Contact>("Contact")({
  Name: Schema.String,
  Id: Schema.String,
}) {}

export class TripLeader extends Schema.Class<TripLeader>("TripLeader")({
  OC_Activity__c: Schema.String,
  Id: Schema.String,
  Contact__c: Schema.String,
  Contact__r: Contact,
}) {}

export class Activity extends Schema.Class<Activity>("Activity")({
  Id: Schema.String,
  Activity_Name__c: Schema.String,
  Audience_Type__c: Schema.String,
  Main_Activity_Difficulty_Rating__c: Schema.String,
  End_Date__c: Schema.DateTimeUtc,
  Start_Date__c: Schema.DateTimeUtc,
  Account__c: Schema.String,
  Description__c: Schema.String,
  Hide_Start_Location_Until_Registered__c: Schema.Boolean,
  Image_File_ID__c: Schema.String,
  Keywords__c: Schema.optional(Schema.String),
  Main_Activity_Sub_Type__c: Schema.String,
  Main_Activity_Type__c: Schema.String,
  Program_Type__c: Schema.String,
  Online_Event__c: Schema.Boolean,
  Register_By_Date__c: Schema.DateTimeUtc,
  Register_By_Date_Passed__c: Schema.Boolean,
  Registration_Type__c: Schema.String,
  Secondary_Activity_Type__c: Schema.optional(Schema.String),
  Start_Latitude__c: Schema.Number,
  Start_Longitude__c: Schema.Number,
  Start_Time__c: Schema.String,
  Start_Concatenation_Formula_Unconverted__c: Schema.String,
  Status__c: Schema.String,
  Time_Zone__c: Schema.String,
  Start_Location__c: Schema.optional(Location),
  OC_Trip_Leaders__r: Schema.Array(TripLeader),
}) {}

export const Activities = Schema.Array(Activity)
