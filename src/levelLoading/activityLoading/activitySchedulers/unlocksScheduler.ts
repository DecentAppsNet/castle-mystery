/* This file parses and schedules room-exit unlocking activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import ExitStatus from "@/game/types/ExitStatus";
import { createUnlockEffect } from "@/game/effects/lockEffectUtil";
import { createLockabilityContext, scheduleLockabilityChange, validateLockabilityAction } from "./util/lockabilitySchedulingUtil";

/** Creates the accepted syntax for unlocking activities. */
export function createUnlocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const unlocks = makeVerb('unlocks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, unlocks, roomId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an exit unlocking into an editable timeline. */
export function scheduleUnlocksActivity(level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {

  const context = createLockabilityContext(level, activity, editableTimeline, errors, 'unlock');
  if (!context) return false;
  if (!validateLockabilityAction(context, 'unlock', ExitStatus.unlocked, errors, activity.lineI)) return false;

  activity.busyCharacterIds = [context.characterId];
  activity.busyItemIds = [];
  activity.endTime = scheduleLockabilityChange(context, ExitStatus.unlocked, createUnlockEffect, editableTimeline);
  return true;
}