import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading2/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading2/errorCollection";

export function createUnlocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const unlocks = makeVerb('unlocks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, unlocks, roomId]);
  return createParseFormat(rootParseStep);
}

export function scheduleUnlocksActivity(_level:Level,
    _activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  return true;
}