/* This file parses and schedules timestamp-constrained character positioning activities.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Activity from "../types/Activity";
import { ErrorCollector } from "@/levelLoading/errorCollection";
import Level from "@/game/types/Level";
import ParseFormat from "../types/ParseFormat";
import { createParseFormat, makeIdentifier, makeLiteral, makeNumber, makeSequence, makeVerb } from "../parseFormatUtil";
import { assert, assertNonNullable } from "decent-portal";
import { findRoom, findRoomAtPosition } from "@/game/roomUtil";
import { arePositionsEqual } from "@/game/types/Position";
import EditableTimeline from "@/levelLoading/timelineLoading/types/EditableTimeline";
import { createKeyframeAtTime } from "@/game/timeline";
import WaypointGenerationContext from "@/levelLoading/types/WaypointGenerationContext";
import { formatMsecsAsTimestamp } from "../timestampUtil";
import { findRoomMovementTargetPosition } from "./util/roomMovementSchedulingUtil";
import { calcCharacterMovementDuration } from "../movementPlanningUtil";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import Room from "@/game/types/Room";
import Position from "@/game/types/Position";
import { MSECS_IN_SECOND } from "@/common/timeUtil";

type PartsShape = {
  characterId:string,
  roomId:string,
  horizontalTarget?:number
}

type MovementOrigin = {
  originSnapshot:TimelineKeyframe,
  originRoom:Room,
  originPosition:Position
}|{
  invalidAtActivity:Activity
};

type ValidMovementOrigin = Exclude<MovementOrigin, { invalidAtActivity:Activity }>;

function _findLatestSameCharacterGoesOrAtActivityBeforeAssertion(assertion:Activity,
    activities:readonly Activity[]):Activity|null {
  const { characterId } = assertion.parts as PartsShape;
  let latestActivity:Activity|null = null;

  // "Before" means an earlier resolved time, then earlier source order when times match.
  for(const candidateActivity of activities) {
    if (candidateActivity.verb !== '@' && candidateActivity.verb !== 'goes') continue;
    if (candidateActivity.parts.characterId !== characterId) continue;
    assertNonNullable(candidateActivity.startTime);
    const isBeforeAssertion = candidateActivity.startTime < assertion.startTime!
      || (candidateActivity.startTime === assertion.startTime && candidateActivity.lineI < assertion.lineI);
    if (!isBeforeAssertion) continue;
    if (!latestActivity || candidateActivity.startTime > latestActivity.startTime!
        || (candidateActivity.startTime === latestActivity.startTime
          && candidateActivity.lineI > latestActivity.lineI)) latestActivity = candidateActivity;
  }
  return latestActivity;
}

function _doesPositionMatchAtActivity(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, position:Position, movementOrigin:ValidMovementOrigin):boolean {
  const { roomId, horizontalTarget } = activity.parts as PartsShape;
  const actualRoom = findRoomAtPosition(level.rooms, position.x, position.y);
  if (actualRoom?.id !== roomId) return false;
  if (horizontalTarget === undefined) return true;

  const targetPosition = findRoomMovementTargetPosition(waypointContext,
    movementOrigin.originSnapshot, actualRoom, horizontalTarget);
  return arePositionsEqual(position, targetPosition);
}

function _findOriginForMovementToRoom(level:Level, waypointContext:WaypointGenerationContext,
  characterI:number, assertion:Activity,
  activities:readonly Activity[], timeline:EditableTimeline):MovementOrigin {

  // Find activity that indicates the previous room the character was instructed to
  // be in according to the itinerary.
  const originActivity = _findLatestSameCharacterGoesOrAtActivityBeforeAssertion(assertion, activities);

  // If there is no origin activity, it just means character will be starting from their first placed position in the level.
  const originSnapshot = originActivity === null
      ? timeline.keyframes[0]
      : createKeyframeAtTime(timeline.keyframes, originActivity.startTime!); // Resist urge to convert this findKeyframeForTime() because some activities like "@" do not create keyframes.

  const originPosition = originSnapshot.characters[characterI].position;
  const originRoom = findRoomAtPosition(level.rooms, originPosition.x, originPosition.y);
  assertNonNullable(originRoom);
  if (originActivity?.verb === '@') {
    const previousOrigin = _findOriginForMovementToRoom(level, waypointContext, characterI,
      originActivity, activities, timeline);
    if ('invalidAtActivity' in previousOrigin
        || !_doesPositionMatchAtActivity(level, waypointContext, originActivity,
          originPosition, previousOrigin)) return { invalidAtActivity:originActivity };
  }

  return { originSnapshot, originRoom, originPosition };
}

function _doesAtActivityMatchSnapshot(level:Level, waypointContext:WaypointGenerationContext,
    activity:Activity, snapshot:TimelineKeyframe, characterI:number,
    activities:readonly Activity[], timeline:EditableTimeline):boolean {
  const movementOrigin = _findOriginForMovementToRoom(level, waypointContext, characterI,
    activity, activities, timeline);
  if ('invalidAtActivity' in movementOrigin) return false;
  return _doesPositionMatchAtActivity(level, waypointContext, activity,
    snapshot.characters[characterI].position, movementOrigin);
}

function _roundDownMsecsToSecond(msecs:number):number {
  return Math.floor(msecs / MSECS_IN_SECOND) * MSECS_IN_SECOND;
}

function _createPlacementCorrectionGuidance(level:Level, waypointContext:WaypointGenerationContext, assertion:Activity,
    activities:readonly Activity[], timeline:EditableTimeline):string {

  const { characterId, roomId, horizontalTarget } = assertion.parts as PartsShape;
  const characterI = timeline.characterIdToI[characterId];

  // I need the room that character would begin moving from to reach the room in the assertion.
  const movementOrigin = _findOriginForMovementToRoom(level, waypointContext, characterI,
    assertion, activities, timeline);
  if ('invalidAtActivity' in movementOrigin) {
    const timestamp = formatMsecsAsTimestamp(movementOrigin.invalidAtActivity.startTime!);
    return `The previous @ activity at ${timestamp} is invalid, so no recommended correction has been made.`;
  }
  const { originRoom, originPosition } = movementOrigin;

  const targetRoom = findRoom(level.rooms, roomId);
  assertNonNullable(targetRoom);
  assertNonNullable(assertion.startTime); // Because validation is done after all activities are scheduled.
  const targetPosition = findRoomMovementTargetPosition(waypointContext,
    movementOrigin.originSnapshot, targetRoom, horizontalTarget);
  const walkDuration = calcCharacterMovementDuration(waypointContext, originRoom, originPosition, targetRoom, targetPosition);
  const suggestedStartTime = _roundDownMsecsToSecond(assertion.startTime - walkDuration); // Round down to nearest section because timestamps don't allow sub-second specification.
  const suggestedStart = formatMsecsAsTimestamp(suggestedStartTime);
  return `${characterId} would need to start movement from ${originRoom.id} at ${suggestedStart} to arrive in time.`;
}

/** Validates room-targeted @ activities against the completed timeline at their assertion times. */
export function validateAtActivities(level:Level, waypointContext:WaypointGenerationContext,
    activities:readonly Activity[], timeline:EditableTimeline, errors:ErrorCollector):void {
  for(const activity of activities) {
    if (activity.verb !== '@') continue;
    
    assertNonNullable(activity.startTime);
    assertNonNullable(activity.endTime);
    assert(Number.isFinite(activity.startTime) && Number.isFinite(activity.endTime));
    const { characterId, roomId, horizontalTarget } = activity.parts as PartsShape;
    assertNonNullable(characterId, 'implied subjects should have been resolved');
    assertNonNullable(roomId);

    // Compare the authored room with the character's interpolated completed-timeline position.
    const characterI = timeline.characterIdToI[characterId];
    const snapshot = createKeyframeAtTime(timeline.keyframes, activity.startTime);
    const position = snapshot.characters[characterI].position;
    const actualRoom = findRoomAtPosition(level.rooms, position.x, position.y);
    assertNonNullable(actualRoom);
    if (_doesAtActivityMatchSnapshot(level, waypointContext, activity, snapshot,
      characterI, activities, timeline)) continue;

    // Create a helpful error for the author.
    const timestamp = formatMsecsAsTimestamp(activity.startTime);
    const guidance = _createPlacementCorrectionGuidance(level, waypointContext, activity, activities, timeline);
    const message = actualRoom.id === roomId
      ? `${characterId} was not at the ${horizontalTarget}% target in ${roomId} at ${timestamp}.`
      : `${characterId} was not at ${roomId} at ${timestamp}. Actual room: ${actualRoom.id}.`;
    errors.addAtLine(`${message} ${guidance}`, activity.lineI);
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
  const horizontalTarget = makeSequence([
    makeLiteral('('), makeNumber('horizontalTarget'), makeLiteral('%'), makeLiteral(')')
  ], true);
  return createParseFormat(makeSequence([characterId, at, roomId, horizontalTarget]));
}