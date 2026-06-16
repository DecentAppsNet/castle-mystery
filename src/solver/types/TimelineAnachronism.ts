/* One timeline anachronism: a single character is scheduled into two overlapping activities of the
  same channel — in two places at once, or mid-two-of-one action (see ../anachronismUtil.ts and
  docs/adr-solver.md). `occupying` is the activity already in progress; `conflicting` is the
  same-channel activity that begins before `occupying` ends. Times are milliseconds since midnight;
  `overlapMsecs` is how long the two spans intersect. */

type AnachronismActivity = Readonly<{
  type:string,      // The ItineraryEventType value of the activity (e.g. "Walk", "Speech").
  startTime:number, // Milliseconds since midnight.
  endTime:number    // startTime + duration.
}>

type TimelineAnachronism = Readonly<{
  characterId:string,
  characterTitle:string,
  occupying:AnachronismActivity,
  conflicting:AnachronismActivity,
  overlapMsecs:number
}>

export type { AnachronismActivity };
export default TimelineAnachronism;
