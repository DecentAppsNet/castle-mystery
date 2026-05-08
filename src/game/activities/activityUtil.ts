import { assertNonNullable } from "decent-portal";

import Character from "../types/Character";
import Item, { duplicateItem } from "../types/Item";
import Level from "../types/Level";
import Position, { duplicatePosition } from "../types/Position";
import Room from "../types/Room";
import RoomExit from "../types/RoomExit";
import ItineraryEvent from "../types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "../types/itineraryEvents/ItineraryEventType";
import FacingEvent from "../types/itineraryEvents/FacingEvent";
import { isPositionWithinRoomObstructionMargin } from "../obstructionUtil";
import { findRoom } from "../roomUtil";
import {
  calcFacingAngle,
  createFacingEvent,
  createItineraryIndex,
  createRoomEntryEvent,
  createWalkEvent,
  findCharacterPose,
  findRoomAtPositionOrNearest,
} from "../itineraryUtil";

const LEFT_RIGHT_MARGIN = 5;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 5;

export type CharacterActivityState = {
  events:ItineraryEvent[],
  time:number,
  position:Position,
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
  timestamp:number
};

function _matchesItemReference(item:Item, reference:string):boolean {
  return item.id === reference || item.title === reference;
}

function _findDefaultPositionInRoom(room:Room):Position {
  const centerX = Math.floor(room.rect.x + room.rect.width / 2);
  const centerY = Math.floor(room.rect.y + room.rect.height / 2);
  let nearestPosition:Position|null = null;
  let nearestDistanceSquared = Infinity;

  for (let y = room.rect.y + TOP_MARGIN; y < room.rect.y + room.rect.height - BOTTOM_MARGIN; ++y) {
    for (let x = room.rect.x + LEFT_RIGHT_MARGIN; x < room.rect.x + room.rect.width - LEFT_RIGHT_MARGIN; ++x) {
      if (isPositionWithinRoomObstructionMargin(room, x, y)) continue;
      const distanceSquared = (centerX - x) ** 2 + (centerY - y) ** 2;
      if (distanceSquared < nearestDistanceSquared) {
        nearestPosition = { x, y };
        nearestDistanceSquared = distanceSquared;
      }
    }
  }

  assertNonNullable(nearestPosition, `no unobstructed activity target available in room ${room.id}`);
  return nearestPosition;
}

function _calcExitClearanceOffsets(room:Room, exit:RoomExit):[dx:number, dy:number] {
  let dx = 0, dy = 0;
  if (exit.x === room.rect.x) {
    dx = -3;
  } else if (exit.x === room.rect.x + room.rect.width) {
    dx = 3;
  } else if (exit.y === room.rect.y) {
    dy = -3;
  } else {
    dy = 3;
  }
  return [dx, dy];
}

function _calcExitApproachPosition(room:Room, exit:RoomExit):Position {
  const [dx, dy] = _calcExitClearanceOffsets(room, exit);
  return { x:Math.round(exit.x - dx), y:Math.round(exit.y - dy) };
}

function _calcExitDestinationPosition(room:Room, exit:RoomExit):Position {
  const [dx, dy] = _calcExitClearanceOffsets(room, exit);
  return { x:Math.round(exit.x + dx), y:Math.round(exit.y + dy) };
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
    facingAngle:character.facingAngle,
    carriedItems:character.items.map(duplicateItem)
  };
}

export function createInitialRoomItemsByRoomId(level:Level):Map<string, Item[]> {
  return new Map(level.rooms.map(room => [room.id, room.items.map(duplicateItem)]));
}

export function createCharacterSnapshot(character:Character, state:CharacterActivityState):Character {
  return {
    ...character,
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

export function appendEventsToCharacterState(character:Character, state:CharacterActivityState, events:ItineraryEvent[]) {
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
  state.facingAngle = pose.facingAngle;
}

export function findCurrentRoom(level:Level, position:Position):Room {
  return findRoomAtPositionOrNearest(level.rooms, position.x, position.y);
}

export function planMovementToRoom(level:Level, fromPosition:Position, targetRoomId:string):ItineraryEvent[] {
  const currentRoom = findCurrentRoom(level, fromPosition);
  if (currentRoom.id === targetRoomId) return [];
  const targetRoom = findRoom(level.rooms, targetRoomId);
  return planMovementToPosition(level, fromPosition, _findDefaultPositionInRoom(targetRoom));
}

export function planMovementToPosition(level:Level, fromPosition:Position, targetPosition:Position):ItineraryEvent[] {
  const targetRoom = findRoomAtPositionOrNearest(level.rooms, targetPosition.x, targetPosition.y);
  const initialRoom = findCurrentRoom(level, fromPosition);
  const roomPath = _findRoomPath(level, initialRoom.id, targetRoom.id);
  const events:ItineraryEvent[] = [];
  let currentPosition = duplicatePosition(fromPosition);
  let currentTime = 0;

  for (let i = 0; i < roomPath.length - 1; ++i) {
    const room = findRoom(level.rooms, roomPath[i]);
    const nextRoom = findRoom(level.rooms, roomPath[i + 1]);
    const exit = _findConnectingExit(room, nextRoom.id);
    const approachPosition = _calcExitApproachPosition(room, exit);
    if (approachPosition.x !== currentPosition.x || approachPosition.y !== currentPosition.y) {
      const approachResult = createWalkEvent(room, currentTime, currentPosition.x, currentPosition.y, approachPosition.x, approachPosition.y);
      if (!approachResult.event || approachResult.wasClipped
        || approachResult.event.toPosition.x !== approachPosition.x || approachResult.event.toPosition.y !== approachPosition.y) {
        throw new Error(`unable to find unobstructed path from ${room.id} to exit for ${nextRoom.id}`);
      }
      events.push(approachResult.event);
      currentTime = approachResult.event.startTime + approachResult.event.duration;
      currentPosition = duplicatePosition(approachResult.event.toPosition);
    }

    const destinationPosition = _calcExitDestinationPosition(room, exit);
    const destinationResult = createWalkEvent(nextRoom, currentTime, currentPosition.x, currentPosition.y, destinationPosition.x, destinationPosition.y);
    if (!destinationResult.event || destinationResult.wasClipped
      || destinationResult.event.toPosition.x !== destinationPosition.x || destinationResult.event.toPosition.y !== destinationPosition.y) {
      throw new Error(`unable to cross exit from ${room.id} to ${nextRoom.id}`);
    }
    events.push(destinationResult.event);
    currentTime = destinationResult.event.startTime + destinationResult.event.duration;
    currentPosition = duplicatePosition(destinationResult.event.toPosition);
    events.push(createRoomEntryEvent(currentTime, nextRoom.id));
  }

  if (currentPosition.x !== targetPosition.x || currentPosition.y !== targetPosition.y) {
    const finalRoom = findRoomAtPositionOrNearest(level.rooms, currentPosition.x, currentPosition.y);
    const finalResult = createWalkEvent(finalRoom, currentTime, currentPosition.x, currentPosition.y, targetPosition.x, targetPosition.y);
    if (!finalResult.event || finalResult.wasClipped
      || finalResult.event.toPosition.x !== targetPosition.x || finalResult.event.toPosition.y !== targetPosition.y) {
      throw new Error(`unable to find unobstructed path to (${targetPosition.x}, ${targetPosition.y}) in room ${finalRoom.id}`);
    }
    events.push(finalResult.event);
  }

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
  characterStatesById:Map<string, CharacterActivityState>, roomItemsByRoomId:Map<string, Item[]>):Position|null {
  const targetCharacter = charactersById.get(targetId) || null;
  if (targetCharacter) {
    const targetState = characterStatesById.get(targetId);
    assertNonNullable(targetState, `missing authored state for character ${targetId}`);
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

export function createFacingEventForTarget(timestamp:number, actorPosition:Position, targetPosition:Position):FacingEvent {
  return createFacingEvent(timestamp, calcFacingAngle(actorPosition.x, actorPosition.y, targetPosition.x, targetPosition.y));
}

