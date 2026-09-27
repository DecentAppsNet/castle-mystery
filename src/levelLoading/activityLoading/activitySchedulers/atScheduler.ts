/* This file parses and schedules timestamp-constrained character positioning activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeLiteral, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { arePositionsEqual } from "@/game/types/Position";
import { scheduleCharacterMovementToRoom, scheduleCharacterMovementToRoomAtTime } from "../movementPlanningUtil";
import { createKeyframeAtTime } from "@/game/timeline";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { findPrecedingBusyCharacterActivityEndTime } from "@/levelLoading/timelineLoading/activityConflictUtil";
import { findRoomMovementTargetPosition } from "./util/roomMovementSchedulingUtil";

type PartsShape = {
  characterId:string,
  roomId?:string,
  horizontalTarget?:number
}

const DEFAULT_HORIZONTAL_TARGET = .5;

type AtSchedulingContext = {
  level:Level,
  waypointContext:WaypointGenerationContext,
  activity:Activity,
  editableTimeline:EditableTimeline,
  errors:ErrorCollector,
  scheduledActivities:readonly Activity[],
  characterId:string,
  characterI:number,
  roomId?:string,
  horizontalPercent:number,
  hasHorizontalTarget:boolean
}

function _isMovementUnneeded(fromRoom:Room, fromPosition:Position, toRoom:Room,
    toPosition:Position, hasHorizontalTarget:boolean):boolean {
  return fromRoom.id === toRoom.id && (!hasHorizontalTarget || arePositionsEqual(fromPosition, toPosition));
}

function _scheduleRelativeAtActivity({ level, waypointContext, activity, editableTimeline, errors, characterI,
    horizontalPercent, hasHorizontalTarget, roomId }:AtSchedulingContext):boolean {
  
  assert(activity.endTime === null); // Relative-timestamp activities have .endTime of null until they are scheduled.
  assertNonNullable(activity.startTime);

  // Gather supporting data.
  const fromKeyframe = createKeyframeAtTime(editableTimeline.keyframes, activity.startTime);
  const fromPosition = fromKeyframe.characters[characterI].position;
  const fromRoom = findRoomAtPosition(level.rooms, fromPosition.x, fromPosition.y);
  assertNonNullable(fromRoom);
  const toRoom = roomId === undefined ? fromRoom : findRoom(level.rooms, roomId); // If roomId is undefined, it indicates same-room travel.
  assertNonNullable(toRoom);
  const toPosition = findRoomMovementTargetPosition(waypointContext, fromKeyframe, toRoom, horizontalPercent);

  // If no movement needed to reach target position, exit trivially.
  if (_isMovementUnneeded(fromRoom, fromPosition, toRoom, toPosition, hasHorizontalTarget)) {
    activity.endTime = activity.startTime;
    return true;
  }

  // Add keyframes as needed to move character to target position, maybe through multiple rooms.
  const result = scheduleCharacterMovementToRoom(waypointContext, fromRoom, fromPosition, activity.startTime,
    toRoom, toPosition, characterI, fromKeyframe.characters[characterI].facingDirection, editableTimeline);
  if (typeof result === 'string') {
    errors.addAtLine(result, activity.lineI);
    return false;
  }
  
  // A route to reach the destination was found.
  assert(result.walkStartDelay === 0); // Character should begin moving immediately for a relative timestamp.
  activity.endTime = activity.startTime + result.walkDuration;
  return true;
}

function _scheduleAbsoluteAtActivity({ level, waypointContext, activity, editableTimeline, errors, scheduledActivities,
    characterId, characterI, horizontalPercent, hasHorizontalTarget, roomId } :AtSchedulingContext):boolean {
  
  assertNonNullable(activity.endTime); // Absolute timestamps for @ activity indicate the arrival time, so are applied to .endTime.
  assert(activity.startTime === null || activity.startTime === level.startTime);
  
  // Gather supporting data. "from" below corresponds to the earliest possible time movement could begin to reach the destination.
  const deadline = activity.endTime;
  assert(deadline >= level.startTime);
  const fromTime = findPrecedingBusyCharacterActivityEndTime(characterId, deadline, scheduledActivities) ?? level.startTime;
  const fromKeyframe = createKeyframeAtTime(editableTimeline.keyframes, fromTime);
  const fromPosition = fromKeyframe.characters[characterI].position;
  const fromRoom = findRoomAtPosition(level.rooms, fromPosition.x, fromPosition.y);
  assertNonNullable(fromRoom);
  const toRoom = roomId === undefined ? fromRoom : findRoom(level.rooms, roomId);
  assertNonNullable(toRoom);
  const deadlineKeyframe = createKeyframeAtTime(editableTimeline.keyframes, deadline);
  const toPosition = findRoomMovementTargetPosition(waypointContext, deadlineKeyframe, toRoom, horizontalPercent);

  // If no movement needed to reach target position, exit trivially.
  if (_isMovementUnneeded(fromRoom, fromPosition, toRoom, toPosition, hasHorizontalTarget)) {
    activity.startTime = activity.endTime = deadline;
    return true;
  }

  // Add keyframes as needed to move character to target position, maybe through multiple rooms.
  const result = scheduleCharacterMovementToRoomAtTime(waypointContext, fromRoom, fromPosition, fromTime,
    toRoom, toPosition, deadline, characterI, fromKeyframe.characters[characterI].facingDirection, editableTimeline);
  if (typeof result === 'string') {
    errors.addAtLine(result, activity.lineI);
    return false;
  }

  // A route to reach the destination by the deadline was found.
  assert(result.walkStartDelay >= 0);
  activity.startTime = fromTime + result.walkStartDelay;
  assert(activity.endTime === activity.startTime + result.walkDuration);
  return true;
}

/** Schedules a character to be at an authored position by the activity end time. */
export function scheduleAtActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, editableTimeline:EditableTimeline, errors:ErrorCollector,
    scheduledActivities:readonly Activity[]):boolean {
  const { characterId, roomId, horizontalTarget } = activity.parts as PartsShape;
  
  assertNonNullable(characterId, 'implied subjects should have been resolved');
  activity.busyCharacterIds = [characterId];
  activity.busyItemIds = [];
  const character = level.characters.find(c => c.id === characterId);
  assertNonNullable(character);
  
  if (!roomId && !horizontalTarget) {
    errors.addAtLine(`The @ activity needs room ID, horizontal target %, or both specified.`, activity.lineI);
    return false;
  }

  const characterI = editableTimeline.characterIdToI[characterId];
  const horizontalPercent = horizontalTarget === undefined ? DEFAULT_HORIZONTAL_TARGET : horizontalTarget / 100;
  const context = { level, waypointContext, activity, editableTimeline, errors, scheduledActivities,
    characterId, characterI, roomId, horizontalPercent, hasHorizontalTarget:horizontalTarget !== undefined };
  return activity.endTime === null
    ? _scheduleRelativeAtActivity(context)
    : _scheduleAbsoluteAtActivity(context);
}

/** Creates the accepted syntax for positioning activities. */
export function createAtActivityParseFormat():ParseFormat {
  const characterId = makeIdentifier('characterId', 'CharacterId', true);
  const at = makeVerb('@');
  const roomId = makeIdentifier('roomId', 'RoomId', true);
  const leftParen = makeLiteral('(');
  const horizontalTarget = makeNumber('horizontalTarget');
  const percent = makeLiteral('%');
  const rightParen = makeLiteral(')');
  const positionSequence = makeSequence([leftParen, horizontalTarget, percent, rightParen], true);
  const rootParseStep = makeSequence([characterId, at, roomId, positionSequence]);
  return createParseFormat(rootParseStep);
}