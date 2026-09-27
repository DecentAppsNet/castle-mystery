/* This file parses and schedules timestamp-constrained character positioning activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoomAtPosition } from "@/game/roomUtil";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { createKeyframeAtTime } from "@/game/timeline";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { formatMsecsAsTimestamp } from "../timestampUtil";

type PartsShape = {
  characterId:string,
  roomId:string
}

/** Validates room-targeted @ activities against the completed timeline at their assertion times. */
export function validateAtActivities(level:Level, activities:readonly Activity[], timeline:EditableTimeline,
    errors:ErrorCollector):void {
  for(const activity of activities) {
    if (activity.verb !== '@') continue;
    
    assertNonNullable(activity.startTime);
    assertNonNullable(activity.endTime);
    assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
    const { characterId, roomId } = activity.parts as PartsShape;
    assertNonNullable(characterId, 'implied subjects should have been resolved');
    assertNonNullable(roomId);

    // Compare the authored room with the character's interpolated completed-timeline position.
    const characterI = timeline.characterIdToI[characterId];
    const snapshot = createKeyframeAtTime(timeline.keyframes, activity.startTime);
    const position = snapshot.characters[characterI].position;
    const actualRoom = findRoomAtPosition(level.rooms, position.x, position.y);
    assertNonNullable(actualRoom);
    if (actualRoom.id === roomId) continue;

    const timestamp = formatMsecsAsTimestamp(activity.startTime);
    errors.addAtLine(`${characterId} was not at ${roomId} at ${timestamp}. Actual room: ${actualRoom.id}.`, activity.lineI);
  }
}

/** Resolves an @ activity as a zero-duration loading-only assertion. */
export function scheduleAtActivity(_level:Level, _waypointContext:WaypointGenerationContext,
    activity:Activity, _editableTimeline:EditableTimeline, _errors:ErrorCollector,
    _scheduledActivities:readonly Activity[]):boolean {
  const { characterId, roomId } = activity.parts as PartsShape;
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  assertNonNullable(roomId);
  assertNonNullable(activity.startTime);
  activity.endTime = activity.startTime;
  activity.busyCharacterIds = [];
  activity.busyItemIds = [];
  return true;
}

/** Creates the accepted syntax for room-placement assertions. */
export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId');
  return createParseFormat(makeSequence([characterId, at, roomId]));
}