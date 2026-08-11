import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";

export function createAppearsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const appears = makeVerb('appears');
  const as = makeLiteral('as', true);
  const appearanceId = makeIdentifier('appearanceId', 'AppearanceId');
  const rootParseStep = makeSequence([characterId, appears, as, appearanceId]);
  return createParseFormat(rootParseStep);
}

export function scheduleAppearsActivity(_level:Level,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  activity.endTime = activity.startTime;
  return true;
}