/* This file parses and schedules room-exit locking activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import ExitStatus from "@/game/types/ExitStatus";
import { createLockEffect } from "@/game/effects/lockEffectUtil";
import { createLockabilityContext, scheduleLockabilityChange, validateLockabilityAction } from "./util/lockabilitySchedulingUtil";

/** Creates the accepted syntax for locking activities. */
export function createLocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const locks = makeVerb('locks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, locks, roomId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an exit lock-state change into an editable timeline. */
export function scheduleLocksActivity(level:Level, _waypointContext:WaypointGenerationContext, activity:Activity, 
    editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const context = createLockabilityContext(level, activity, editableTimeline, errors, 'lock');
  if (!context) return false;
  if (!validateLockabilityAction(context, 'lock', ExitStatus.locked, errors, activity.lineI)) return false;

  activity.busyCharacterIds = [context.characterId];
  activity.busyItemIds = [];
  activity.endTime = scheduleLockabilityChange(context, ExitStatus.locked, createLockEffect, editableTimeline);
  return true;
}
