import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeOptions, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

export function createDropsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const drops = makeVerb('drops');
  const itemId = makeIdentifier('itemId', 'ItemId');
  const preposition = makeOptions([
    makeLiteral('at'),
    makeLiteral('on'),
    makeLiteral('onto'),
    makeLiteral('to'),
  ]);
  const targetOptions = makeOptions([
    makeIdentifier('toItemId', 'ItemId'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ]);
  const target = makeSequence([preposition, targetOptions], true);
  const rootParseStep = makeSequence([characterId, drops, itemId, target]);
  return createParseFormat(rootParseStep);
}

export function scheduleDropsActivity(_level:Level, 
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  
  // TODO
  activity.endTime = activity.startTime;
  return true;
}