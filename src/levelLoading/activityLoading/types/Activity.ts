import ActivityParts from "./ActivityParts";

type Activity = {
  lineI:number,
  verb:string;
  startTime:number|null,
  endTime:number|null,
  parts:ActivityParts,
  prevActivity:Activity|null,
  nextActivity:Activity|null
}

export type ParsedActivity = Omit<Activity, 'lineI'>;

export default Activity;