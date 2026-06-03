import { LeadingTimestampKind } from "@/levelLoading/timestampUtil";

type ParsedItineraryActivity = {
  sourceIndex:number,
  time:number|null,
  resolvedTime:number,
  isTimeResolved:boolean,
  timestampType:LeadingTimestampKind,
  lineNo:number,
  characterId:string,
  activityText:string
};

export default ParsedItineraryActivity;