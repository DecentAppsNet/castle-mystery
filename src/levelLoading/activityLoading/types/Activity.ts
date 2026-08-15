import ActivityParts from "./ActivityParts";

type Activity = {
  lineI:number,
  verb:string;
  startTime:number|null,
  endTime:number|null,
  parts:ActivityParts,
  nextActivity:Activity|null
}

export type ParsedActivity = Omit<Activity, 'lineI'>;

export default Activity;