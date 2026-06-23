/* This module groups shared level-loading activity helpers for timing, movement planning, parsing, and state replay.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

export type { default as ActivityContext } from "./activity/types/ActivityContext";
export {
  addStateOwnedItem,
  appendEventsToCharacterState,
  createCharacterActivityState,
  createInitialRoomItemsByRoomId,
  duplicateCharacterActivityState,
  duplicateRoomItemsByRoomId,
  findCurrentRoom,
  findCurrentRoomForWaypoint,
  findStateOwnedItem,
  findStatePoseAtTime,
  removeStateOwnedItem,
} from "./activity/activityStateUtil";
export {
  calcActivityStartTime,
  ensureTimestampIsAvailable,
  findEarliestAbsoluteActivityStartTime,
  scheduleEventsToEndAtTime,
  scheduleEventsToStartAtTime
} from "./activity/activitySchedulingUtil";
export { findWaypointPath, planMovementToRoom, planMovementWithinRoom } from "./activity/activityMovementUtil";
export { findRoomItemById, findTargetPositionAtTime } from "./activity/activityTargetingUtil";

export { findSentenceStyleActivityVerb, parseSentenceStyleActivityText, stripTrailingPeriod } from "./activity/activityTextParseUtil";

