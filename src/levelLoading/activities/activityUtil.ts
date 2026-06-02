import { assertNonNullable } from "decent-portal";

import Character from "@/game/types/Character";
import { duplicateItineraryEvent } from "@/game/types/itineraryEvents/ItineraryEvent";
import Item, { duplicateItem } from "@/game/types/Item";
import Level from "@/game/types/Level";
import Position, { duplicatePosition } from "@/game/types/Position";
import Room from "@/game/types/Room";
import RoomExit from "@/game/types/RoomExit";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import RoomEntryEvent from "@/game/types/itineraryEvents/RoomEntryEvent";
import { isPositionStrictlyInRect } from "@/game/rectUtil";
import { findRoom } from "@/game/roomUtil";
import { findExitWaypoint, findNearestWaypoint, findNearestWaypointToPosition, FLOOR_WAYPOINT_Y_OFFSET, WAYPOINT_MIDDLE_ROW_Z } from "@/game/waypointUtil";
import {
  createItineraryIndex,
  createRoomEntryEvent,
  createWalkEvent,
  findCharacterPose,
  findRoomAtPositionOrNearest,
} from "@/game/itineraryUtil";
import { assertNormalizedId, normalizeId } from "@/game/idUtil";

export type ActivityTimestampType = 'absolute' | 'after-previous-activity';

export type CharacterActivityState = {
  events:ItineraryEvent[],
  time:number,
  position:Position,
  waypoint:Waypoint,
  carriedItems:Item[]
};

export type ActivityContext = {
  level:Level,
  character:Character,
  activitySourceIndex:number,
  state:CharacterActivityState,
  roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>,
  characterStatesById:Map<string, CharacterActivityState>,
  poseOverridesByCharacterId:Map<string, Position>,
  timestamp:number,
  timestampType:ActivityTimestampType
};

function _matchesItemReference(item:Item, reference:string):boolean {
  const normalizedReference = normalizeId(reference);
  return item.id === normalizedReference || normalizeId(item.title) === normalizedReference;
}

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y},${waypoint.position.z}`;
}

function _findFloorWaypoints(room:Room, occupiedWaypointKeys:Set<string>):Waypoint[] {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const unclaimedFloorWaypoints = room.waypoints.filter(waypoint => waypoint.position.y === floorY
    && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z
    && !occupiedWaypointKeys.has(_createWaypointKey(waypoint)));
  if (unclaimedFloorWaypoints.length > 0) return unclaimedFloorWaypoints;
  return room.waypoints.filter(waypoint => waypoint.position.y === floorY && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z);
}

function _findNearestFloorWaypointByX(room:Room, targetX:number, occupiedWaypointKeys:Set<string> = new Set()):Waypoint {
  const floorWaypoints = _findFloorWaypoints(room, occupiedWaypointKeys);
  if (!floorWaypoints.length) throw new Error(`unable to find floor waypoint in room ${room.id}`);
  return floorWaypoints.reduce((nearestWaypoint, waypoint) => {
    if (!nearestWaypoint) return waypoint;
    const nearestDistance = Math.abs(nearestWaypoint.position.x - targetX);
    const distance = Math.abs(waypoint.position.x - targetX);
    return distance < nearestDistance ? waypoint : nearestWaypoint;
  }, null as Waypoint | null)!;
}

function _findNearestWaypointWithFallbacks(room:Room, x:number, y:number,
  predicates:((((waypoint:Waypoint) => boolean)) | undefined)[]):Waypoint {
  for (const predicate of predicates) {
    try {
      return findNearestWaypoint(room, x, y, predicate);
    } catch {
      continue;
    }
  }

  throw new Error(`unable to find waypoint in room ${room.id}`);
}

function _findPreferredWaypointInRoom(room:Room, occupiedWaypointKeys:Set<string> = new Set()):Waypoint {
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  const centerY = Math.floor(room.rect.y + room.rect.height / 2);
  const isInteriorWaypoint = (waypoint:Waypoint) => isPositionStrictlyInRect(waypoint.position.x, waypoint.position.y, room.rect);

  try {
    return _findNearestFloorWaypointByX(room, centerX, occupiedWaypointKeys);
  } catch {
    return _findNearestWaypointWithFallbacks(room, centerX, centerY, [
      waypoint => isInteriorWaypoint(waypoint) && !occupiedWaypointKeys.has(_createWaypointKey(waypoint)),
      isInteriorWaypoint,
      waypoint => !occupiedWaypointKeys.has(_createWaypointKey(waypoint)),
      undefined
    ]);
  }
}

function _findTargetWaypointInRoom(room:Room, targetPosition:Position|null, occupiedWaypointKeys:Set<string> = new Set(), targetXPercent:number|null = null):Waypoint {
  if (targetXPercent !== null) {
    const targetX = room.rect.x + room.rect.width * (targetXPercent / 100);
    return _findNearestFloorWaypointByX(room, targetX, occupiedWaypointKeys);
  }
  if (!targetPosition) return _findPreferredWaypointInRoom(room, occupiedWaypointKeys);
  return findNearestWaypointToPosition(room, targetPosition, waypoint => !occupiedWaypointKeys.has(_createWaypointKey(waypoint)));
}

function _findConnectingExit(room:Room, otherRoomId:string):RoomExit {
  assertNormalizedId(otherRoomId, 'room');
  const exit = room.exits.find(candidate => candidate.room1Id === otherRoomId || candidate.room2Id === otherRoomId);
  assertNonNullable(exit, `no exit connects ${room.id} to ${otherRoomId}`);
  return exit;
}

function _findRoomPath(level:Level, fromRoomId:string, targetRoomId:string):string[] {
  assertNormalizedId(fromRoomId, 'room');
  assertNormalizedId(targetRoomId, 'room');
  if (fromRoomId === targetRoomId) return [fromRoomId];
  const pending:string[] = [fromRoomId];
  const previousRoomIdByRoomId = new Map<string, string|null>([[fromRoomId, null]]);

  while (pending.length > 0) {
    const roomId = pending.shift()!;
    const room = findRoom(level.rooms, roomId);
    for (const exit of room.exits) {
      const neighborRoomId = exit.room1Id === roomId ? exit.room2Id : exit.room1Id;
      if (previousRoomIdByRoomId.has(neighborRoomId)) continue;
      previousRoomIdByRoomId.set(neighborRoomId, roomId);
      if (neighborRoomId === targetRoomId) {
        const roomPath = [targetRoomId];
        let currentRoomId:string|null = roomId;
        while (currentRoomId) {
          roomPath.unshift(currentRoomId);
          currentRoomId = previousRoomIdByRoomId.get(currentRoomId) ?? null;
        }
        return roomPath;
      }
      pending.push(neighborRoomId);
    }
  }

  throw new Error(`no room path found from ${fromRoomId} to ${targetRoomId}`);
}

function _shiftEventTimes(events:ItineraryEvent[], delta:number):ItineraryEvent[] {
  return events.map(event => ({ ...event, startTime:event.startTime + delta }) as ItineraryEvent);
}

function _matchesSentenceStyleActivityVerb(trimmedActivityText:string, verb:string):boolean {
  if (!trimmedActivityText.startsWith(verb)) return false;
  const nextChar = trimmedActivityText.charAt(verb.length);
  return !nextChar || nextChar === ' ';
}

export function findSentenceStyleActivityVerb<Verb extends string>(activityText:string, verbs:readonly Verb[]):Verb|null {
  const trimmedActivityText = activityText.trim();
  return verbs.find(verb => _matchesSentenceStyleActivityVerb(trimmedActivityText, verb)) ?? null;
}

export function parseSentenceStyleActivityText(activityText:string, verb:string, contentType:string):string {
  const contentText = activityText.trim().slice(verb.length).trim();
  if (!contentText.length) throw new Error(`missing ${contentType} text in authored activity '${activityText}'`);
  if (contentText.startsWith('"')) {
    const closingQuoteIndex = contentText.lastIndexOf('"');
    if (closingQuoteIndex <= 0) throw new Error(`unterminated ${contentType} text in authored activity '${activityText}'`);
    return contentText.slice(1, closingQuoteIndex);
  }
  return contentText;
}

export function stripTrailingPeriod(text:string):string {
  const trimmedText = text.trim();
  return trimmedText.endsWith('.') ? trimmedText.slice(0, -1).trim() : trimmedText;
}

export function createCharacterActivityState(character:Character):CharacterActivityState {
  return {
    events:[],
    time:0,
    position:{ x:character.x, y:character.y, z:character.depth },
    waypoint:character.waypoint,
    carriedItems:character.items.map(duplicateItem)
  };
}

export function createInitialRoomItemsByRoomId(level:Level):Map<string, Item[]> {
  return new Map(level.rooms.map(room => [room.id, room.items.map(duplicateItem)]));
}

export function duplicateCharacterActivityState(state:CharacterActivityState):CharacterActivityState {
  return {
    events:state.events.map(duplicateItineraryEvent),
    time:state.time,
    position:duplicatePosition(state.position),
    waypoint:state.waypoint,
    carriedItems:state.carriedItems.map(duplicateItem)
  };
}

export function duplicateRoomItemsByRoomId(roomItemsByRoomId:Map<string, Item[]>):Map<string, Item[]> {
  return new Map(Array.from(roomItemsByRoomId.entries()).map(([roomId, items]) => [roomId, items.map(duplicateItem)]));
}

function createCharacterSnapshot(character:Character, state:CharacterActivityState):Character {
  return {
    ...character,
    waypoint:state.waypoint,
    itinerary:[...state.events],
    itineraryIndex:createItineraryIndex(state.events, { x:character.x, y:character.y, z:character.depth })
  };
}

export function findStatePoseAtTime(character:Character, state:CharacterActivityState, time:number) {
  if (!state.events.length) {
    return {
      position:{ x:character.x, y:character.y, z:character.depth },
      speech:null
    };
  }
  return findCharacterPose(createCharacterSnapshot(character, state), time);
}

export function calcActivityStartTime(state:CharacterActivityState, timestamp:number, timestampType:ActivityTimestampType):number {
  return timestampType === 'absolute' ? timestamp : Math.max(timestamp, state.time);
}

export function ensureTimestampIsAvailable(state:CharacterActivityState, timestamp:number, activityText:string, timestampType:ActivityTimestampType) {
  if (timestampType === 'absolute' && timestamp < findEarliestAbsoluteActivityStartTime(state)) {
    throw new Error(`unable to schedule itinerary activity '${activityText}' at ${timestamp}`);
  }
}

export function scheduleEventsToEndAtTime(events:ItineraryEvent[], timestamp:number, earliestStartTime:number):ItineraryEvent[] {
  if (!events.length) {
    if (timestamp < earliestStartTime) throw new Error(`activity at ${timestamp} overlaps a previous itinerary activity`);
    return [];
  }
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  const totalDuration = lastEvent.startTime + lastEvent.duration;
  const scheduledStartTime = timestamp - totalDuration;
  if (scheduledStartTime < earliestStartTime) {
    throw new Error(`unable to arrive by itinerary timestamp ${timestamp}`);
  }
  return _shiftEventTimes(events, scheduledStartTime);
}

export function scheduleEventsToStartAtTime(events:ItineraryEvent[], timestamp:number, earliestStartTime:number):ItineraryEvent[] {
  if (!events.length) {
    if (timestamp < earliestStartTime) throw new Error(`activity at ${timestamp} overlaps a previous itinerary activity`);
    return [];
  }
  const firstEvent = events[0];
  assertNonNullable(firstEvent);
  const scheduledStartTime = timestamp - firstEvent.startTime;
  if (scheduledStartTime < earliestStartTime) {
    throw new Error(`unable to start itinerary activity at ${timestamp}`);
  }
  return _shiftEventTimes(events, scheduledStartTime);
}

export function findEarliestAbsoluteActivityStartTime(state:CharacterActivityState):number {
  return state.events.reduce((blockingTime, event) =>
    Math.max(blockingTime, event.startTime + _getBlockingDurationForScheduling(event, 'absolute')), 0);
}

function _getBlockingDurationForScheduling(event:ItineraryEvent, timestampType:ActivityTimestampType):number {
  switch (event.type) {
    case ItineraryEventType.WALK:
      return event.duration;
    case ItineraryEventType.SPEECH:
      return timestampType === 'after-previous-activity' ? event.duration : 0;
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
      return event.duration;
    default:
      return 0;
  }
}

export function appendEventsToCharacterState(level:Level, character:Character, state:CharacterActivityState, events:ItineraryEvent[]) {
  if (!events.length) return;
  state.events.push(...events);
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  let blockingTime = state.time;
  for (const event of events) {
    blockingTime = Math.max(blockingTime, event.startTime + _getBlockingDurationForScheduling(event, 'after-previous-activity'));
  }
  state.time = blockingTime;
  const pose = findStatePoseAtTime(character, state, state.time);
  state.position = duplicatePosition(pose.position);
  const room = _findRoomForStateWaypointUpdate(level, state.waypoint, events);
  state.waypoint = findNearestWaypointToPosition(room, state.position);
}

export function findCurrentRoom(level:Level, position:Position):Room {
  return findRoomAtPositionOrNearest(level.rooms, position.x, position.y);
}

function _findWaypointOwningRoom(level:Level, waypoint:Waypoint):Room|null {
  return level.rooms.find(room => room.waypoints.includes(waypoint)) || null;
}

export function findCurrentRoomForWaypoint(level:Level, waypoint:Waypoint):Room {
  return _findWaypointOwningRoom(level, waypoint) || findCurrentRoom(level, waypoint.position);
}

function _findRoomForStateWaypointUpdate(level:Level, waypoint:Waypoint, events:ItineraryEvent[]):Room {
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    const event = events[eventIndex];
    if (event.type === ItineraryEventType.ROOM_ENTRY) return findRoom(level.rooms, (event as RoomEntryEvent).roomId);
  }

  return _findWaypointOwningRoom(level, waypoint) || findCurrentRoom(level, waypoint.position);
}

function _isMiddleRowFloorWaypoint(room:Room, waypoint:Waypoint):boolean {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  return Math.abs(waypoint.position.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET
    && waypoint.position.z === WAYPOINT_MIDDLE_ROW_Z;
}

function _sortAdjacentWaypointsForPathTraversal(room:Room, targetWaypoint:Waypoint, adjacentWaypoints:ReadonlyArray<Waypoint>):Waypoint[] {
  const targetIsMiddleRowFloorWaypoint = _isMiddleRowFloorWaypoint(room, targetWaypoint);
  return [...adjacentWaypoints].sort((waypoint1, waypoint2) => {
    if (targetIsMiddleRowFloorWaypoint) {
      const waypoint1IsMiddleRowFloor = _isMiddleRowFloorWaypoint(room, waypoint1);
      const waypoint2IsMiddleRowFloor = _isMiddleRowFloorWaypoint(room, waypoint2);
      if (waypoint1IsMiddleRowFloor !== waypoint2IsMiddleRowFloor) return waypoint1IsMiddleRowFloor ? -1 : 1;
    }

    const rowDistance1 = Math.abs(waypoint1.position.z - targetWaypoint.position.z);
    const rowDistance2 = Math.abs(waypoint2.position.z - targetWaypoint.position.z);
    if (rowDistance1 !== rowDistance2) return rowDistance1 - rowDistance2;

    const yDistance1 = Math.abs(waypoint1.position.y - targetWaypoint.position.y);
    const yDistance2 = Math.abs(waypoint2.position.y - targetWaypoint.position.y);
    if (yDistance1 !== yDistance2) return yDistance1 - yDistance2;

    const xDistance1 = Math.abs(waypoint1.position.x - targetWaypoint.position.x);
    const xDistance2 = Math.abs(waypoint2.position.x - targetWaypoint.position.x);
    if (xDistance1 !== xDistance2) return xDistance1 - xDistance2;

    return waypoint1.position.x - waypoint2.position.x || waypoint1.position.y - waypoint2.position.y;
  });
}

export function findWaypointPath(room:Room, fromWaypoint:Waypoint, toWaypoint:Waypoint):Waypoint[] {
  if (fromWaypoint === toWaypoint) return [fromWaypoint];
  const pending:Waypoint[] = [fromWaypoint];
  const previousByKey = new Map<string, Waypoint|null>([[_createWaypointKey(fromWaypoint), null]]);

  while (pending.length > 0) {
    const waypoint = pending.shift()!;
    for (const adjacentWaypoint of _sortAdjacentWaypointsForPathTraversal(room, toWaypoint, waypoint.adjacentWaypoints)) {
      const key = _createWaypointKey(adjacentWaypoint);
      if (previousByKey.has(key)) continue;
      previousByKey.set(key, waypoint);
      if (adjacentWaypoint === toWaypoint) {
        const path = [toWaypoint];
        let current:Waypoint|null = waypoint;
        while (current) {
          path.unshift(current);
          current = previousByKey.get(_createWaypointKey(current)) ?? null;
        }
        return path;
      }
      pending.push(adjacentWaypoint);
    }
  }

  throw new Error(`no waypoint path found in room ${room.id}`);
}

export function planMovementWithinRoom(room:Room, fromWaypoint:Waypoint, targetWaypoint:Waypoint, startTime:number = 0):ItineraryEvent[] {
  const waypointPath = findWaypointPath(room, fromWaypoint, targetWaypoint);
  const events:ItineraryEvent[] = [];
  let currentWaypoint = fromWaypoint;
  let currentTime = startTime;

  for (let i = 1; i < waypointPath.length; ++i) {
    const nextWaypoint = waypointPath[i];
    const walkEvent = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextWaypoint.position.x, nextWaypoint.position.y, currentWaypoint.position, nextWaypoint.position);
    if (!walkEvent) {
      currentWaypoint = nextWaypoint;
      continue;
    }
    events.push(walkEvent);
    currentTime = walkEvent.startTime + walkEvent.duration;
    currentWaypoint = nextWaypoint;
  }

  return events;
}

export function planMovementToRoom(level:Level, fromWaypoint:Waypoint, targetRoomId:string,
  occupiedWaypointKeys:Set<string> = new Set(), targetPosition:Position|null = null, targetXPercent:number|null = null):ItineraryEvent[] {
  const currentRoom = findCurrentRoomForWaypoint(level, fromWaypoint);
  const targetRoom = findRoom(level.rooms, targetRoomId);
  const targetWaypoint = _findTargetWaypointInRoom(targetRoom, targetPosition, occupiedWaypointKeys, targetXPercent);
  if (currentRoom.id === targetRoomId) {
    if (fromWaypoint === targetWaypoint) return [];
    return planMovementWithinRoom(currentRoom, fromWaypoint, targetWaypoint, 0);
  }
  const roomPath = _findRoomPath(level, currentRoom.id, targetRoom.id);
  const events:ItineraryEvent[] = [];
  let currentWaypoint = fromWaypoint;
  let currentTime = 0;

  for (let i = 0; i < roomPath.length - 1; ++i) {
    const room = findRoom(level.rooms, roomPath[i]);
    const nextRoom = findRoom(level.rooms, roomPath[i + 1]);
    while (currentWaypoint.exitDirections[nextRoom.id]) {
      const nextWaypoint = currentWaypoint.exitDirections[nextRoom.id]!;
      const walkEvent = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
        nextWaypoint.position.x, nextWaypoint.position.y, currentWaypoint.position, nextWaypoint.position);
      if (!walkEvent) {
        currentWaypoint = nextWaypoint;
        continue;
      }
      events.push(walkEvent);
      currentTime = walkEvent.startTime + walkEvent.duration;
      currentWaypoint = nextWaypoint;
    }

    const exit = _findConnectingExit(room, nextRoom.id);
    const nextRoomExitWaypoint = findExitWaypoint(nextRoom.id, nextRoom.rect, exit, nextRoom.waypoints);
    const crossRoomWalkEvent = createWalkEvent(nextRoom, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextRoomExitWaypoint.position.x, nextRoomExitWaypoint.position.y, currentWaypoint.position, nextRoomExitWaypoint.position);
    if (crossRoomWalkEvent) {
      events.push(crossRoomWalkEvent);
      currentTime = crossRoomWalkEvent.startTime + crossRoomWalkEvent.duration;
    }
    currentWaypoint = nextRoomExitWaypoint;
    events.push(createRoomEntryEvent(currentTime, nextRoom.id));
  }

  const finalRoom = findRoom(level.rooms, targetRoomId);
  const finalEvents = planMovementWithinRoom(finalRoom, currentWaypoint, targetWaypoint, currentTime);
  events.push(...finalEvents);

  return events;
}

export function findRoomItemById(roomItemsByRoomId:Map<string, Item[]>, level:Level, itemId:string):{ room:Room, item:Item }|null {
  for (const room of level.rooms) {
    const roomItems = roomItemsByRoomId.get(room.id) || [];
    const item = roomItems.find(candidate => _matchesItemReference(candidate, itemId)) || null;
    if (item) return { room, item };
  }
  return null;
}

export function findTargetPositionAtTime(targetId:string, timestamp:number, charactersById:Map<string, Character>,
  characterStatesById:Map<string, CharacterActivityState>, roomItemsByRoomId:Map<string, Item[]>, poseOverridesByCharacterId?:Map<string, Position>):Position|null {
  const targetCharacter = charactersById.get(targetId) || null;
  if (targetCharacter) {
    const poseOverride = poseOverridesByCharacterId?.get(targetId);
    if (poseOverride) return duplicatePosition(poseOverride);
    const targetState = characterStatesById.get(targetId);
    assertNonNullable(targetState, `missing itinerary state for character ${targetId}`);
    return findStatePoseAtTime(targetCharacter, targetState, timestamp).position;
  }

  for (const roomItems of roomItemsByRoomId.values()) {
    const item = roomItems.find(candidate => _matchesItemReference(candidate, targetId)) || null;
    if (item) return duplicatePosition(item.position);
  }

  for (const [characterId, state] of characterStatesById.entries()) {
    const item = state.carriedItems.find(candidate => _matchesItemReference(candidate, targetId)) || null;
    if (!item) continue;
    const targetCharacterForItem = charactersById.get(characterId) || null;
    assertNonNullable(targetCharacterForItem, `missing character ${characterId} for carried item ${targetId}`);
    return findStatePoseAtTime(targetCharacterForItem, state, timestamp).position;
  }

  return null;
}

