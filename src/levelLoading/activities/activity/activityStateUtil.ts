/* This module groups mutable activity-state helpers, including state duplication, pose replay, and room lookup.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assertNonNullable } from "decent-portal";

import Character from "@/game/types/Character";
import { addOwnedItem, getOwnedItems, removeOwnedItemById } from "@/game/itemOwnershipUtil";
import { duplicateItineraryEvent } from "@/game/types/itineraryEvents/ItineraryEvent";
import Item, { duplicateItem } from "@/game/types/Item";
import ItemHoldLocation from "@/game/types/ItemHoldLocation";
import Level from "@/game/types/Level";
import Position, { duplicatePosition } from "@/game/types/Position";
import Room from "@/game/types/Room";
import Waypoint from "@/game/types/Waypoint";
import ItineraryEvent from "@/game/types/itineraryEvents/ItineraryEvent";
import ItineraryEventType from "@/game/types/itineraryEvents/ItineraryEventType";
import RoomEntryEvent from "@/game/types/itineraryEvents/RoomEntryEvent";
import { findRoom } from "@/game/roomUtil";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import {
  createItineraryIndex,
  findCharacterPose,
  findRoomAtPositionOrNearest,
} from "@/game/itineraryUtil";

import { matchesItemReference } from "./activityItemRefUtil";
import { calcBlockingDurationForScheduling } from "./activitySchedulingUtil";
import type CharacterActivityState from "./types/CharacterActivityState";

function _createCharacterSnapshot(character:Character, state:CharacterActivityState):Character {
  return {
    ...character,
    waypoint:state.waypoint,
    itinerary:[...state.events],
    itineraryIndex:createItineraryIndex(state.events, { x:character.x, y:character.y, z:character.depth })
  };
}

function _findWaypointOwningRoom(level:Level, waypoint:Waypoint):Room|null {
  return level.rooms.find(room => room.waypoints.includes(waypoint)) || null;
}

function _findRoomForStateWaypointUpdate(level:Level, waypoint:Waypoint, events:ItineraryEvent[]):Room {
  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    const event = events[eventIndex];
    if (event.type === ItineraryEventType.ROOM_ENTRY) return findRoom(level.rooms, (event as RoomEntryEvent).roomId);
  }

  return _findWaypointOwningRoom(level, waypoint) || findCurrentRoom(level, waypoint.position);
}

export function createCharacterActivityState(character:Character):CharacterActivityState {
  return {
    events:[],
    time:0,
    position:{ x:character.x, y:character.y, z:character.depth },
    waypoint:character.waypoint,
    items:character.items.map(duplicateItem),
    leftHandItem:character.leftHandItem ? duplicateItem(character.leftHandItem) : null,
    rightHandItem:character.rightHandItem ? duplicateItem(character.rightHandItem) : null
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
    items:state.items.map(duplicateItem),
    leftHandItem:state.leftHandItem ? duplicateItem(state.leftHandItem) : null,
    rightHandItem:state.rightHandItem ? duplicateItem(state.rightHandItem) : null
  };
}

export function addStateOwnedItem(state:CharacterActivityState, item:Item, location:ItemHoldLocation) {
	addOwnedItem(state, item, location);
}

export function findStateOwnedItem(state:CharacterActivityState, itemRef:string):Item|null {
	return getOwnedItems(state).find(candidate => matchesItemReference(candidate, itemRef)) || null;
}

export function removeStateOwnedItem(state:CharacterActivityState, itemRef:string):Item|null {
	const item = findStateOwnedItem(state, itemRef);
	if (!item) return null;
	return removeOwnedItemById(state, item.id);
}

export function duplicateRoomItemsByRoomId(roomItemsByRoomId:Map<string, Item[]>):Map<string, Item[]> {
  return new Map(Array.from(roomItemsByRoomId.entries()).map(([roomId, items]) => [roomId, items.map(duplicateItem)]));
}

export function findStatePoseAtTime(character:Character, state:CharacterActivityState, time:number) {
  if (!state.events.length) {
    return {
      position:{ x:character.x, y:character.y, z:character.depth },
      isAlive:character.isAlive,
      facingDirection:character.facingDirection,
      bodyOrientation:character.bodyOrientation,
      speech:null,
      thought:null
    };
  }
  return findCharacterPose(_createCharacterSnapshot(character, state), time);
}

export function appendEventsToCharacterState(level:Level, character:Character, state:CharacterActivityState, events:ItineraryEvent[]) {
  if (!events.length) return;
  state.events.push(...events);
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  let blockingTime = state.time;
  for (const event of events) {
    blockingTime = Math.max(blockingTime, event.startTime + calcBlockingDurationForScheduling(event, 'after-previous-activity'));
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

export function findCurrentRoomForWaypoint(level:Level, waypoint:Waypoint):Room {
  return _findWaypointOwningRoom(level, waypoint) || findCurrentRoom(level, waypoint.position);
}