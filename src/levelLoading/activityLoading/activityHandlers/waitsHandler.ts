import { assert, assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { findCharacterKeyframeForTime } from "@/game/timeline/retrievalUtil";
import { addCharacterKeyframe } from "@/levelLoading/timelineLoading";

const DEFAULT_WAIT_MSECS = 1_000;

export function createWaitsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const waits = makeVerb('waits');
  const seconds = makeNumber('seconds', true);
  const rootParseStep = makeSequence([characterId, waits, seconds]);
  return createParseFormat(rootParseStep);
}

export function scheduleWaitsActivity(_level:Level,
     activity:Activity, editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId, seconds } = activity.parts;

  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);
  
  const duration = typeof seconds === 'number' ? seconds : DEFAULT_WAIT_MSECS;
  activity.endTime = activity.startTime + duration;
  
  // Add a key value at the end time to capture waiting in the timeline. Any key value would work.
  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  const keyframe = findCharacterKeyframeForTime(editableTimeline.keyframes, characterI, activity.startTime);
  const bodyOrientation = keyframe.bodyOrientation;
  addCharacterKeyframe({ bodyOrientation }, characterI, activity.endTime, editableTimeline);
  
  return true;
}