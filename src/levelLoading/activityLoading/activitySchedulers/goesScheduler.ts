/* This file parses and schedules start-time room-directed character movement activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { createParseFormat, makeIdentifier, makeLiteral, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import Activity from "../types/Activity";
import ParseFormat from "../types/ParseFormat";
import { scheduleStartTimeRoomMovement } from "./util/roomMovementSchedulingUtil";

/** Creates the accepted syntax for start-time room movement activities. */
export function createGoesParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const goes = makeVerb('goes');
  const to = makeLiteral('to', true);
  const roomId = makeIdentifier('roomId', 'RoomId', true);
  const horizontalTarget = makeSequence([
    makeLiteral('('), makeNumber('horizontalTarget'), makeLiteral('%'), makeLiteral(')')
  ], true);
  return createParseFormat(makeSequence([characterId, goes, to, roomId, horizontalTarget]));
}

/** Schedules start-time room-directed movement into an editable timeline. */
export function scheduleGoesActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector):boolean {
  return scheduleStartTimeRoomMovement(level, waypointContext, activity, editableTimeline, errors);
}