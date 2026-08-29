import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeOptions, makeSequence, makeText, makeVariableLiteral, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assertNonNullable } from "decent-portal";
import { addCharacterEffect } from "@/levelLoading/timelineLoading";
import { calcSpeechDuration, findSpeechConflict } from "./util/speechUtil";
import { createEmitsEffect } from "@/game/effects/speechEffectUtil";

export function createEmitsParseFormat():ParseFormat {
  const subject = makeOptions([
    makeIdentifier('characterId', 'CharacterId'),
    makeIdentifier('itemId', 'ItemId'),
  ], true);
  const emits = makeVerb('emits');
  const text = makeText();
  const loudly = makeVariableLiteral('isLoud', 'loudly', true);
  const rootParseStep = makeSequence([subject, emits, text, loudly]);
  return createParseFormat(rootParseStep);
}

type PartsShape = {
  characterId:string,
  text:string,
  verb:'emits',
  isLoud?:string
}

export function scheduleEmitsActivity(level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  assertNonNullable(activity.startTime);
  const { characterId, text, verb, isLoud } = activity.parts as PartsShape;
  const characterI = editableTimeline.characterIdToI[characterId];

  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const speechConflictResult = findSpeechConflict(verb, level.rooms, editableTimeline.keyframes,
    characterI, activity.startTime, activity.endTime);
  if (speechConflictResult) {
    errors.addAtLine(speechConflictResult, activity.lineI);
    return false;
  }

  const emitsEffect = createEmitsEffect(text, activity.startTime, speechDuration, isLoud !== undefined);
  addCharacterEffect(emitsEffect, characterI, editableTimeline);
  return true;
}