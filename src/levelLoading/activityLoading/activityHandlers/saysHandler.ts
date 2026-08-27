import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeLiteral, makeSequence, makeText, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { findCharacterFacingDirection } from "./util/facingUtil";
import { assertNonNullable } from "decent-portal";
import { addCharacterEffect, addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import { calcSpeechDuration, findSpeechConflict } from "./util/speechUtil";
import { createSaysEffect } from "@/game/effects/speechEffectUtil";
import { findCharacterPositionAtTime } from "@/game/timeline";

export function createSaysParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const says = makeVerb('says');
  const text = makeText('text');
  const toSequence = makeSequence([
    makeLiteral('to'),
    makeIdentifier('toCharacterId', 'CharacterId'),
  ], true);
  const rootParseStep = makeSequence([characterId, says, text, toSequence]);
  return createParseFormat(rootParseStep);
}

type PartsShape = {
  characterId:string,
  text:string,
  toCharacterId?:string
  verb:'says'
}

export function scheduleSaysActivity(level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  
  assertNonNullable(activity.startTime);
  const { characterId, text, toCharacterId, verb} = activity.parts as PartsShape;
  const characterI = editableTimeline.characterIdToI[characterId];

  // Face towards character if activity had "to Character".
  if (toCharacterId) {
    const facingDirection = findCharacterFacingDirection(characterId, toCharacterId, editableTimeline, activity.startTime);
    addCharacterKeyChanges({ facingDirection }, characterI, activity.startTime, editableTimeline);
  }

  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const speechConflictResult = findSpeechConflict(verb, level.rooms, editableTimeline.keyframes, characterI, activity.startTime, activity.endTime);
  if (speechConflictResult) {
    errors.addAtLine(speechConflictResult, activity.lineI);
    return false;
  }

  const characterPosition = findCharacterPositionAtTime(editableTimeline.keyframes, characterI, activity.startTime); // TODO - call findCharacterKeyframeAtTime() once at start and reuse for facing direction.
  const saysEffect = createSaysEffect(characterPosition, text, activity.startTime, speechDuration);
  addCharacterEffect(saysEffect, characterI, editableTimeline);
  return true;
}