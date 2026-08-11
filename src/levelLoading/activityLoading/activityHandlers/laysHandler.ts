import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { addCharacterKeyframe } from "@/levelLoading/timelineLoading";

export function createLaysParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('lays'),
  ]);
  return createParseFormat(rootParseStep);
}

export function scheduleLaysActivity(_level:Level,
    activity:Activity, editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId } = activity.parts;
  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  
  addCharacterKeyframe({ bodyOrientation:'laying'}, characterI, activity.startTime, editableTimeline);

  activity.endTime = activity.startTime;
  
  return true;
}