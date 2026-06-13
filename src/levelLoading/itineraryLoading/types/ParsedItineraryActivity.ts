import { LeadingTimestampKind } from "@/levelLoading/timestampUtil";

export type ItineraryActivitySubjectKind = 'character' | 'item';

type ParsedItineraryActivity = {
  sourceIndex:number,
  time:number|null,
  resolvedTime:number,
  isTimeResolved:boolean,
  timestampType:LeadingTimestampKind,
  lineNo:number,
  characterId:string,
  subjectKind:ItineraryActivitySubjectKind,
  subjectId:string,
  activityText:string
};

export default ParsedItineraryActivity;