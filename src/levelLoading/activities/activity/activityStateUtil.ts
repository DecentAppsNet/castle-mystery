/* This module groups mutable activity-state helpers, including state duplication, pose replay, and room lookup.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";

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
import FaceEvent from "@/game/types/itineraryEvents/FaceEvent";
import BodyOrientationEvent from "@/game/types/itineraryEvents/BodyOrientationEvent";
import SpeechEvent from "@/game/types/itineraryEvents/SpeechEvent";
import ThoughtEvent from "@/game/types/itineraryEvents/ThoughtEvent";
import WalkEvent from "@/game/types/itineraryEvents/WalkEvent";
import { findRoom } from "@/game/roomUtil";
import { findNearestWaypointToPosition } from "@/game/waypointUtil";
import {
  createInitialPoseEventFromUnpairedCharacter,
  createItineraryIndex,
  doesItineraryBeginWithInitialPoseEvent,
  findCharacterPoseWithoutPairHistory,
  findRoomAtPositionOrNearest,
} from "@/game/itineraryUtil";

import { matchesItemReference } from "./activityItemRefUtil";
import { calcBlockingDurationForScheduling } from "./activitySchedulingUtil";
import type CharacterActivityState from "./types/CharacterActivityState";
import InitialPoseEvent from "@/game/types/itineraryEvents/InitialPoseEvent";
import CharacterPose from "@/game/types/CharacterPose";

function _createCharacterSnapshot(character:Character, state:CharacterActivityState):Character {
  assert(doesItineraryBeginWithInitialPoseEvent(state.events), `Can't create character snapshot with invalid events - missing initial pose event.`);
  const stateInitialPoseCharacterId = (state.events[0] as InitialPoseEvent).firstCharacterId;
  assert(stateInitialPoseCharacterId === character.id, `state.events has an initial pose for "${stateInitialPoseCharacterId}", but we are making a snapshot for "${character.id}".`);
  return {
    ...character,
    waypoint:state.waypoint,
    itinerary:[...state.events],
    itineraryIndex:createItineraryIndex(state.events, character.position, character.id)
  };
}

function _updateStatePoseFromEvent(state:CharacterActivityState, event:ItineraryEvent, settledTime:number) {
  if (event.startTime > settledTime) return;

  switch (event.type) {
    case ItineraryEventType.WALK: {
      const walkEvent = event as WalkEvent;
      const endTime = walkEvent.startTime + walkEvent.duration;
      if (settledTime < endTime) return;
      state.position = duplicatePosition(walkEvent.toPosition);
      if (walkEvent.toPosition.x > walkEvent.fromPosition.x) state.facingDirection = 'right';
      else if (walkEvent.toPosition.x < walkEvent.fromPosition.x) state.facingDirection = 'left';
      state.bodyOrientation = 'standing';
      return;
    }
    case ItineraryEventType.FACE:
      state.facingDirection = (event as FaceEvent).facingDirection;
      return;
    case ItineraryEventType.BODY_ORIENTATION:
      state.bodyOrientation = (event as BodyOrientationEvent).bodyOrientation;
      return;
    case ItineraryEventType.SPEECH: {
      const speechEvent = event as SpeechEvent;
      state.speech = settledTime < speechEvent.startTime + speechEvent.duration ? speechEvent.speech : null;
      return;
    }
    case ItineraryEventType.THOUGHT: {
      const thoughtEvent = event as ThoughtEvent;
      state.thought = settledTime < thoughtEvent.startTime + thoughtEvent.duration ? thoughtEvent.thought : null;
      return;
    }
    case ItineraryEventType.EMIT:
    case ItineraryEventType.CHARACTER_ENCOUNTER:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
    case ItineraryEventType.BECOMES_ITEM:
    case ItineraryEventType.LOCK:
    case ItineraryEventType.UNLOCK:
    case ItineraryEventType.SHOW:
    case ItineraryEventType.HIDE:
    case ItineraryEventType.ROOM_ENTRY:
      return;
    default:
      return;
  }
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
    events:[createInitialPoseEventFromUnpairedCharacter(character)],
    time:0,
    isVisible:character.isVisible,
    position:duplicatePosition(character.position),
    waypoint:character.waypoint,
    items:character.items.map(duplicateItem),
    leftHandItem:character.leftHandItem ? duplicateItem(character.leftHandItem) : null,
    rightHandItem:character.rightHandItem ? duplicateItem(character.rightHandItem) : null,
    facingDirection:character.facingDirection,
    bodyOrientation:character.bodyOrientation,
    speech:null,
    thought:null
  };
}

export function createInitialRoomItemsByRoomId(level:Level):Map<string, Item[]> {
  return new Map(level.rooms.map(room => [room.id, room.items.map(duplicateItem)]));
}

export function duplicateCharacterActivityState(state:CharacterActivityState):CharacterActivityState {
  assert(doesItineraryBeginWithInitialPoseEvent(state.events), `State.events is missing an initial pose event.`);
  return {
    events:state.events.map(duplicateItineraryEvent),
    time:state.time,
    isVisible:state.isVisible,
    position:duplicatePosition(state.position),
    waypoint:state.waypoint,
    items:state.items.map(duplicateItem),
    leftHandItem:state.leftHandItem ? duplicateItem(state.leftHandItem) : null,
    rightHandItem:state.rightHandItem ? duplicateItem(state.rightHandItem) : null,
    facingDirection:state.facingDirection,
    bodyOrientation:state.bodyOrientation,
    speech:state.speech,
    thought:state.thought
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

export function findStatePoseAtTime(character:Character, state:CharacterActivityState, time:number):CharacterPose {
  if (!state.events.length) {
    return {
      position:duplicatePosition(character.position),
      facingDirection:character.facingDirection,
      bodyOrientation:character.bodyOrientation,
      speech:null,
      thought:null
    };
  }
  assert(doesItineraryBeginWithInitialPoseEvent(state.events), `state.events is missing initial pose event.`);
  { // TODO delete this hack. The best way to do it would to untangle the data structures and put clearer contracts around what they contain.
    // But for the moment this is hiding that the InitialPoseEvent in `state` don't have a matching character ID with the character.
    // _createCharacterSnapshot() correctly asserts for that, but this hack is more or less saying "don't worry about it for now".
    const initialPoseEvent = state.events[0] as InitialPoseEvent;
    if (character.id !== initialPoseEvent.firstCharacterId) {
      state.events.shift();
      state.events.unshift({...initialPoseEvent, firstCharacterId:character.id});
    }
  }
  if (time === state.time) {
    return {
      position:duplicatePosition(state.position),
      facingDirection:state.facingDirection,
      bodyOrientation:state.bodyOrientation,
      speech:state.speech,
      thought:state.thought
    };
  }
  const snapshot = _createCharacterSnapshot(character, state);
  return findCharacterPoseWithoutPairHistory(snapshot, time);
}

export function appendEventsToCharacterState(level:Level, _character:Character, state:CharacterActivityState, events:ItineraryEvent[]) {
  if (!events.length) return;
  state.events.push(...events);
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  let blockingTime = state.time;
  for (const event of events) {
    blockingTime = Math.max(blockingTime, event.startTime + calcBlockingDurationForScheduling(event, 'after-previous-activity'));
  }
  state.time = blockingTime;
  state.speech = null;
  state.thought = null;
  for (const event of events) {
    _updateStatePoseFromEvent(state, event, state.time);
  }
  const room = _findRoomForStateWaypointUpdate(level, state.waypoint, events);
  state.waypoint = findNearestWaypointToPosition(room, state.position);
}

export function findCurrentRoom(level:Level, position:Position):Room {
  return findRoomAtPositionOrNearest(level.rooms, position.x, position.y);
}

export function findCurrentRoomForWaypoint(level:Level, waypoint:Waypoint):Room {
  return _findWaypointOwningRoom(level, waypoint) || findCurrentRoom(level, waypoint.position);
}