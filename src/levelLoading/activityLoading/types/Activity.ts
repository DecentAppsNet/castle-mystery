import ActivityParts from "./ActivityParts";

/** An authored activity with source location, timing, parsed values, and authored successor. */
type Activity = {
  lineI:number,
  verb:string;
  startTime:number|null,
  endTime:number|null,
  busyCharacterIds:readonly string[],
  busyItemIds:readonly string[],
  parts:ActivityParts,
  nextActivity:Activity|null
}

/** An activity before its combined-text source line index is assigned. */
export type ParsedActivity = Omit<Activity, 'lineI'|'busyCharacterIds'|'busyItemIds'>;

export default Activity;
