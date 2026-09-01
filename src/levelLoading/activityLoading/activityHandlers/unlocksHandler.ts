/* This file parses and schedules room-exit unlocking activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Level from "@/game/types/Level";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import ParseFormat from "../types/ParseFormat";
import Activity from "../types/Activity";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";

/** Creates the accepted syntax for unlocking activities. */
export function createUnlocksParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const unlocks = makeVerb('unlocks');
  const roomId = makeIdentifier('roomId', 'RoomId');
  const rootParseStep = makeSequence([characterId, unlocks, roomId]);
  return createParseFormat(rootParseStep);
}

/** Schedules an exit lock-state change into an editable timeline. */
export function scheduleUnlocksActivity(_level:Level,
  _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector):boolean {

  // TODO
  activity.endTime = activity.startTime;
  return true;
}