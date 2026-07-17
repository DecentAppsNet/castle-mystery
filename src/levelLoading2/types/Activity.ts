import ActivityParts from "./ActivityParts";

type Activity = {
  verb:string;
  startTime:number|null,
  duration:number|null,
  parts:ActivityParts
}

export default Activity;