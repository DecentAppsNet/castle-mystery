/* This file parses and schedules explicit character waiting activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

const DEFAULT_WAIT_MSECS = 1_000;

/** Creates the accepted syntax for waiting activities. */
export function createWaitsParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const waits = makeVerb('waits');
  const seconds = makeNumber('seconds', true);
  const rootParseStep = makeSequence([characterId, waits, seconds]);
  return createParseFormat(rootParseStep);
}

/** Schedules a character wait into an editable timeline. */
export function scheduleWaitsActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
  activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {
  const { characterId, seconds } = activity.parts;

  assert(typeof characterId === 'string');
  assertNonNullable(activity.startTime);
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  
  const duration = typeof seconds === 'number' ? seconds * MSECS_IN_SECOND : DEFAULT_WAIT_MSECS;
  activity.endTime = activity.startTime + duration;
  
  return true;
}