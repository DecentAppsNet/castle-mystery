import ActivityParts from "./ActivityParts";

type Activity = {
  verb:string;
  startTime:number|null,
  duration:number|null,
  parts:ActivityParts,
  prevActivity:Activity|null
}

export default Activity;