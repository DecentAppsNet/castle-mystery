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
import { calcSpeechDuration } from "./util/speechUtil";
import { createThinksEffect } from "@/game/effects/speechEffectUtil";
import { findKeyframeForTime } from "@/game/timeline";
import { prepareSpeechText } from "./util/speechTextPreparationUtil";

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
  text:string
}

/** Schedules a character thought into an editable timeline. */
export function scheduleThinksActivity(_level:Level, _waypointContext:WaypointGenerationContext,
  activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  
  assertNonNullable(activity.startTime);
  const { characterId, text } = activity.parts as PartsShape;
  const preparedText = prepareSpeechText(text, activity, errors);
  if (!preparedText) return false;
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);

  const speechDuration = calcSpeechDuration(preparedText.plainText);
  activity.endTime = activity.startTime + speechDuration;

  const keyframe = findKeyframeForTime(editableTimeline.keyframes, activity.startTime);
  const facingDirection = keyframe.characters[characterI].facingDirection;
  const thinksEffect = createThinksEffect(preparedText, activity.startTime, speechDuration, facingDirection);
  addCharacterEffect(thinksEffect, characterI, editableTimeline);
  return true;
}