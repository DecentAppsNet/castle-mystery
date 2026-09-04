/* This file parses and schedules character thought activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeText, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { assertNonNullable } from "decent-portal";
import { addCharacterEffect } from "@/levelLoading/timelineLoading";
import { calcSpeechDuration, findSpeechConflict } from "./util/speechUtil";
import { createThinksEffect } from "@/game/effects/speechEffectUtil";

/** Creates the accepted syntax for thought activities. */
export function createThinksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const thinks = makeVerb('thinks');
  const text = makeText('text');
  const rootParseStep = makeSequence([characterId, thinks, text]);
  return createParseFormat(rootParseStep);
}

type PartsShape = {
  characterId:string,
  text:string,
  verb:'thinks'
}

/** Schedules a character thought into an editable timeline. */
export function scheduleThinksActivity(level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  
  assertNonNullable(activity.startTime);
  const { characterId, text, verb} = activity.parts as PartsShape;
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);

  const speechDuration = calcSpeechDuration(text);
  activity.endTime = activity.startTime + speechDuration;

  const speechConflictResult = findSpeechConflict(verb, level.rooms, editableTimeline.keyframes, characterI, activity.startTime, activity.endTime);
  if (speechConflictResult) {
    errors.addAtLine(speechConflictResult, activity.lineI);
    return false;
  }
  
  const thinksEffect = createThinksEffect(text, activity.startTime, speechDuration);
  addCharacterEffect(thinksEffect, characterI, editableTimeline);
  return true;
}