/* This file parses and schedules character standing activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { assert, assertNonNullable } from "decent-portal";
import { addCharacterKeyChanges } from "@/levelLoading/timelineLoading";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for standing activities. */
export function createStandsParseFormat():ParseFormat {
  const rootParseStep = makeSequence([
    makeIdentifier('characterId', 'CharacterId', true),
    makeVerb('stands'),
  ]);
  return createParseFormat(rootParseStep);
}

/** Schedules a standing posture into an editable timeline. */
export function scheduleStandsActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId } = activity.parts;
  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];

  const characterI = editableTimeline.characterIdToI[characterId];
  assertNonNullable(characterI);
  
  addCharacterKeyChanges({ bodyOrientation:'standing'}, characterI, activity.startTime, editableTimeline);

  activity.endTime = activity.startTime;
  
  return true;
}