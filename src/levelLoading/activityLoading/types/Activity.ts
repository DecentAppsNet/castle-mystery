import ActivityParts from "./ActivityParts";

type Activity = {
  verb:string;
  startTime:number|null,
  endTime:number|null,
  parts:ActivityParts,
  prevActivity:Activity|null,
  nextActivity:Activity|null
}

export default Activity;