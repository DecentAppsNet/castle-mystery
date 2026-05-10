import { assertNonNullable } from "decent-portal";
import { calcAngleBetweenPoints } from "@/common/angleUtil";

import Character from "../types/Character";
import { duplicateItineraryEvent } from "../types/itineraryEvents/ItineraryEvent";
import Item, { duplicateItem } from "../types/Item";
import Level from "../types/Level";
import Position, { duplicatePosition } from "../types/Position";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import Waypoint from "../types/Waypoint";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import FacingEvent from "../types/itineraryEvents/FacingEvent";
import WalkEvent from "../types/itineraryEvents/WalkEvent";
import { findExitWaypoint, findNearestWaypoint, findRoom } from "../roomUtil";
import {
  createFacingEvent,
  createItineraryIndex,
  createRoomEntryEvent,
  createWalkEvent,
  findCharacterPose,
  findRoomAtPositionOrNearest,
} from "../itineraryUtil";

export type CharacterActivityState = {
  events:ItineraryEvent[],
  time:number,
  position:Position,
  waypoint:Waypoint,
  facingAngle:number,
  carriedItems:Item[]
};

export type ActivityContext = {
  level:Level,
  character:Character,
  state:CharacterActivityState,
  roomItemsByRoomId:Map<string, Item[]>,
  charactersById:Map<string, Character>,
  characterStatesById:Map<string, CharacterActivityState>,
  poseOverridesByCharacterId:Map<string, Position>,
  timestamp:number
};

function _matchesItemReference(item:Item, reference:string):boolean {
  return item.id === reference || item.title === reference;
}

function _createWaypointKey(waypoint:Waypoint):string {
  return `${waypoint.position.x},${waypoint.position.y}`;
}

export function createWaypointKey(waypoint:Waypoint):string {
  return _createWaypointKey(waypoint);
}

function _findPreferredWaypointInRoom(room:Room, occupiedWaypointKeys:Set<string> = new Set()):Waypoint {
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  const centerY = Math.floor(room.rect.y + room.rect.height / 2);
  return findNearestWaypoint(room, centerX, centerY, waypoint => !occupiedWaypointKeys.has(_createWaypointKey(waypoint)));
}

function _findConnectingExit(room:Room, otherRoomId:string):RoomExit {
  const exit = room.exits.find(candidate => candidate.room1Id === otherRoomId || candidate.room2Id === otherRoomId);
  assertNonNullable(exit, `no exit connects ${room.id} to ${otherRoomId}`);
  return exit;
}

function _findRoomPath(level:Level, fromRoomId:string, targetRoomId:string):string[] {
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

export function stripTrailingPeriod(text:string):string {
  const trimmedText = text.trim();
  return trimmedText.endsWith('.') ? trimmedText.slice(0, -1).trim() : trimmedText;
}

export function createCharacterActivityState(character:Character):CharacterActivityState {
  return {
    events:[],
    time:0,
    position:{ x:character.x, y:character.y },
    waypoint:character.waypoint,
    facingAngle:character.facingAngle,
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
    facingAngle:state.facingAngle,
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
    itineraryIndex:createItineraryIndex(state.events, { x:character.x, y:character.y })
  };
}

export function findStatePoseAtTime(character:Character, state:CharacterActivityState, time:number) {
  if (!state.events.length) {
    return {
      position:{ x:character.x, y:character.y },
      facingAngle:character.facingAngle,
      speech:null
    };
  }
  return findCharacterPose(createCharacterSnapshot(character, state), time);
}

export function ensureTimestampIsAvailable(state:CharacterActivityState, timestamp:number, activityText:string) {
  if (timestamp < state.time) throw new Error(`unable to schedule itinerary activity '${activityText}' at ${timestamp}`);
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

export function appendEventsToCharacterState(level:Level, character:Character, state:CharacterActivityState, events:ItineraryEvent[]) {
  if (!events.length) return;
  state.events.push(...events);
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  let blockingTime = state.time;
  for (const event of events) {
    if (event.type !== ItineraryEventType.WALK) {
      blockingTime = Math.max(blockingTime, event.startTime);
      continue;
    }
    blockingTime = Math.max(blockingTime, event.startTime + event.duration);
  }
  state.time = blockingTime;
  const pose = findStatePoseAtTime(character, state, state.time);
  state.position = duplicatePosition(pose.position);
  const waypoint = level.rooms.flatMap(room => room.waypoints)
    .find(candidate => candidate.position.x === state.position.x && candidate.position.y === state.position.y);
  if (waypoint) state.waypoint = waypoint;
  state.facingAngle = pose.facingAngle;
}

export function addFacingEventsForWalks(character:Character, state:CharacterActivityState, events:ItineraryEvent[]):ItineraryEvent[] {
  if (!events.length) return events;
  const output:ItineraryEvent[] = [];

  for (const event of events) {
    if (event.type === ItineraryEventType.WALK) {
      const walkEvent = event as WalkEvent;
      const scheduledCharacter:Character = {
        ...character,
        itinerary:[...state.events, ...output],
        itineraryIndex:createItineraryIndex([...state.events, ...output], { x:character.x, y:character.y })
      };
      const currentFacingAngle = findCharacterPose(scheduledCharacter, walkEvent.startTime).facingAngle;
      const targetFacingAngle = calcAngleBetweenPoints(
        walkEvent.fromPosition.x,
        walkEvent.fromPosition.y,
        walkEvent.toPosition.x,
        walkEvent.toPosition.y
      );
      const facingEvent = createFacingEvent(walkEvent.startTime, currentFacingAngle, targetFacingAngle);
      if (facingEvent.duration > 0 || currentFacingAngle !== targetFacingAngle) output.push(facingEvent);
    }
    output.push(event);
  }

  return output;
}

export function findCurrentRoom(level:Level, position:Position):Room {
  return findRoomAtPositionOrNearest(level.rooms, position.x, position.y);
}

export function findWaypointPath(room:Room, fromWaypoint:Waypoint, toWaypoint:Waypoint):Waypoint[] {
  if (fromWaypoint === toWaypoint) return [fromWaypoint];
  const pending:Waypoint[] = [fromWaypoint];
  const previousByKey = new Map<string, Waypoint|null>([[`${fromWaypoint.position.x},${fromWaypoint.position.y}`, null]]);

  while (pending.length > 0) {
    const waypoint = pending.shift()!;
    for (const adjacentWaypoint of waypoint.adjacentWaypoints) {
      const key = `${adjacentWaypoint.position.x},${adjacentWaypoint.position.y}`;
      if (previousByKey.has(key)) continue;
      previousByKey.set(key, waypoint);
      if (adjacentWaypoint === toWaypoint) {
        const path = [toWaypoint];
        let current:Waypoint|null = waypoint;
        while (current) {
          path.unshift(current);
          current = previousByKey.get(`${current.position.x},${current.position.y}`) ?? null;
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
    const moveResult = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextWaypoint.position.x, nextWaypoint.position.y);
    if (!moveResult.event || moveResult.wasClipped) throw new Error(`unable to follow waypoint route in room ${room.id}`);
    events.push(moveResult.event);
    currentTime = moveResult.event.startTime + moveResult.event.duration;
    currentWaypoint = nextWaypoint;
  }

  return events;
}

export function planMovementToRoom(level:Level, fromWaypoint:Waypoint, targetRoomId:string, occupiedWaypointKeys:Set<string> = new Set()):ItineraryEvent[] {
  const currentRoom = findCurrentRoom(level, fromWaypoint.position);
  if (currentRoom.id === targetRoomId) return [];
  const targetRoom = findRoom(level.rooms, targetRoomId);
  const targetWaypoint = _findPreferredWaypointInRoom(targetRoom, occupiedWaypointKeys);
  const roomPath = _findRoomPath(level, currentRoom.id, targetRoom.id);
  const events:ItineraryEvent[] = [];
  let currentWaypoint = fromWaypoint;
  let currentTime = 0;

  for (let i = 0; i < roomPath.length - 1; ++i) {
    const room = findRoom(level.rooms, roomPath[i]);
    const nextRoom = findRoom(level.rooms, roomPath[i + 1]);
    while (currentWaypoint.exitDirections[nextRoom.id]) {
      const nextWaypoint = currentWaypoint.exitDirections[nextRoom.id]!;
      const moveResult = createWalkEvent(room, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
        nextWaypoint.position.x, nextWaypoint.position.y);
      if (!moveResult.event || moveResult.wasClipped) throw new Error(`unable to reach exit waypoint from ${room.id} toward ${nextRoom.id}`);
      events.push(moveResult.event);
      currentTime = moveResult.event.startTime + moveResult.event.duration;
      currentWaypoint = nextWaypoint;
    }

    const exit = _findConnectingExit(room, nextRoom.id);
    const nextRoomExitWaypoint = findExitWaypoint(nextRoom.id, nextRoom.rect, exit, nextRoom.waypoints);
    const crossRoomResult = createWalkEvent(nextRoom, currentTime, currentWaypoint.position.x, currentWaypoint.position.y,
      nextRoomExitWaypoint.position.x, nextRoomExitWaypoint.position.y);
    if (!crossRoomResult.event || crossRoomResult.wasClipped) throw new Error(`unable to cross exit from ${room.id} to ${nextRoom.id}`);
    events.push(crossRoomResult.event);
    currentTime = crossRoomResult.event.startTime + crossRoomResult.event.duration;
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

export function createFacingEventForTarget(timestamp:number, currentFacingAngle:number, actorPosition:Position, targetPosition:Position):FacingEvent {
  return createFacingEvent(timestamp, currentFacingAngle,
    calcAngleBetweenPoints(actorPosition.x, actorPosition.y, targetPosition.x, targetPosition.y));
}

