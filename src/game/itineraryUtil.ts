/* This module groups itinerary event creation, indexing, duration, and pose-reconstruction helpers.
  If this module grows beyond 500 lines of code, read the "Refactoring Large Modules" section in CONTRIBUTING.md before making changes. */

import { assert, assertNonNullable } from "decent-portal";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import DieEvent from "./types/itineraryEvents/DieEvent";
import RoomEntryEvent from "./types/itineraryEvents/RoomEntryEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import EmitEvent from "./types/itineraryEvents/EmitEvent";
import ThoughtEvent from "./types/itineraryEvents/ThoughtEvent";
import CharacterEncounterEvent from "./types/itineraryEvents/CharacterEncounterEvent";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import LockEvent from "./types/itineraryEvents/LockEvent";
import UnlockEvent from "./types/itineraryEvents/UnlockEvent";
import VisibilityEvent from "./types/itineraryEvents/VisibilityEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import ItemHoldLocation from "./types/ItemHoldLocation";
import type { BodyOrientation, FacingDirection } from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { findRoomAtPosition, findRoomAtPositionOrTouchingBoundary, findRoomNearestToPosition } from "./roomUtil";
import { roomWidthToColumnCount } from "./roomGridUtil";
import { ROOM_BACK_Z } from "./roomSpaceConstants";
import { FLOOR_WAYPOINT_Y_OFFSET } from "./waypointUtil";
import ItineraryIndex from "./types/ItineraryIndex";
import { ITEM_EFFECT_DURATION } from "./effects/dropItemUtil";
import FaceEvent from "./types/itineraryEvents/FaceEvent";
import BodyOrientationEvent from "./types/itineraryEvents/BodyOrientationEvent";

const WALK_MSECS_PER_PIXEL = 60;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;
const WAYPOINT_DEPTH_ROW_COUNT = 3;

type CharacterPose = {
  position:Position,
  isAlive:boolean,
  facingDirection:FacingDirection,
  bodyOrientation:BodyOrientation,
  speech:string|null,
  thought:string|null
}

function _calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

function _calcWalkDuration(room:Room, fromPosition:Position, toPosition:Position):number {
  const floorY = room.rect.y + room.rect.height - FLOOR_WAYPOINT_Y_OFFSET;
  const isFloorMove = Math.abs(fromPosition.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET
    && Math.abs(toPosition.y - floorY) <= FLOOR_WAYPOINT_Y_OFFSET;
  const columnWidth = room.rect.width / roomWidthToColumnCount(room.rect.width);
  const isDepthOnlyMove = fromPosition.x === toPosition.x
    && fromPosition.y === toPosition.y
    && fromPosition.z !== toPosition.z;
  if (isDepthOnlyMove) return Math.max(1, Math.floor(columnWidth * WALK_MSECS_PER_PIXEL * 0.5));
  const depthDistance = isFloorMove ? 0 : (toPosition.z - fromPosition.z) * WAYPOINT_DEPTH_ROW_COUNT * columnWidth;
  const distance = Math.hypot(toPosition.x - fromPosition.x, toPosition.y - fromPosition.y, depthDistance);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _findRoomAtPosition(rooms:Room[], x:number, y:number):Room {
  let room = findRoomAtPosition(rooms, x, y);
  if (!room) room = findRoomAtPositionOrTouchingBoundary(rooms, x, y);
  if (!room) {
    console.warn(`Position (${x}, ${y}) is not in a room.`);
    room = findRoomNearestToPosition(rooms, x, y); // Don't know what happened, but try to be robust.
  }
  return room;
}

export function createWalkEvent(_room:Room, startTime:number, fromX:number, fromY:number, toX:number, toY:number,
  fromWaypointPosition?:Position, toWaypointPosition?:Position):WalkEvent|null {
  const initialFromPosition = fromWaypointPosition ? duplicatePosition(fromWaypointPosition) : { x:fromX, y:fromY, z:ROOM_BACK_Z };
  const finalToPosition = toWaypointPosition ? duplicatePosition(toWaypointPosition) : { x:toX, y:toY, z:ROOM_BACK_Z };
  const duration = _calcWalkDuration(_room, initialFromPosition, finalToPosition);
  if (duration <= 0) return null;
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:initialFromPosition,
    toPosition:finalToPosition,
    fromWaypointPosition:fromWaypointPosition ? duplicatePosition(fromWaypointPosition) : undefined,
    toWaypointPosition:toWaypointPosition ? duplicatePosition(toWaypointPosition) : undefined,
    duration
  };
}

export function createSpeechEvent(startTime:number, speech:string):SpeechEvent {
  return {
    type:ItineraryEventType.SPEECH,
    startTime,
    speech,
    duration:_calcSpeechDuration(speech)
  };
}

export function createEmitEvent(startTime:number, itemId:string|null, emitText:string):EmitEvent {
  return {
    type:ItineraryEventType.EMIT,
    startTime,
    itemId,
    emitText,
    duration:_calcSpeechDuration(emitText)
  };
}

export function createDieEvent(startTime:number):DieEvent {
  return {
    type:ItineraryEventType.DIE,
    startTime,
    duration:0
  };
}

export function createFaceEvent(startTime:number, facingDirection:FacingDirection):FaceEvent {
  return {
    type:ItineraryEventType.FACE,
    startTime,
    duration:0,
    facingDirection
  };
}

export function createBodyOrientationEvent(startTime:number, bodyOrientation:BodyOrientation):BodyOrientationEvent {
  return {
    type:ItineraryEventType.BODY_ORIENTATION,
    startTime,
    duration:0,
    bodyOrientation
  };
}

export function createThoughtEvent(startTime:number, thought:string):ThoughtEvent {
  return {
    type:ItineraryEventType.THOUGHT,
    startTime,
    thought,
    duration:_calcSpeechDuration(thought)
  };
}

export function createCharacterEncounterEvent(startTime:number, encounteredCharacterIds:string[]):CharacterEncounterEvent {
  return {
    type:ItineraryEventType.CHARACTER_ENCOUNTER,
    startTime,
    duration:0,
    encounteredCharacterIds:[...encounteredCharacterIds]
  };
}

export function createTakeItemEvent(startTime:number, itemId:string, destination:ItemHoldLocation):TakeItemEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, duration:ITEM_EFFECT_DURATION, itemId, destination };
}

export function createDropItemEvent(startTime:number, itemId:string, position:Position, drawOffset:Position):DropItemEvent {
  return {
    type:ItineraryEventType.DROP_ITEM,
    startTime,
    duration:ITEM_EFFECT_DURATION,
    itemId,
    position:duplicatePosition(position),
    drawOffset:duplicatePosition(drawOffset)
  };
}

export function createGiveItemEvent(startTime:number, itemId:string, recipientCharacterId:string):GiveItemEvent {
  return { type:ItineraryEventType.GIVE_ITEM, startTime, duration:0, itemId, recipientCharacterId };
}

export function createLockEvent(startTime:number, roomExitId:string):LockEvent {
  return { type:ItineraryEventType.LOCK, startTime, duration:0, roomExitId };
}

export function createUnlockEvent(startTime:number, roomExitId:string):UnlockEvent {
  return { type:ItineraryEventType.UNLOCK, startTime, duration:0, roomExitId };
}

export function createShowEvent(startTime:number, targetId:string):VisibilityEvent {
  return { type:ItineraryEventType.SHOW, startTime, duration:0, targetId };
}

export function createHideEvent(startTime:number, targetId:string):VisibilityEvent {
  return { type:ItineraryEventType.HIDE, startTime, duration:0, targetId };
}

export function createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, duration:0, roomId };
}

export function findRoomAtPositionOrNearest(rooms:Room[], x:number, y:number):Room {
  return _findRoomAtPosition(rooms, x, y);
}

function _findItineraryPose(character:Character, time:number):CharacterPose {
  let position = duplicatePosition(character.position);
  let isAlive = character.isAlive;
  let facingDirection = character.facingDirection;
  let bodyOrientation = character.bodyOrientation;
  let speech:string|null = null;
  let thought:string|null = null;

  for (const event of character.itinerary) {
    if (event.startTime > time) break;

    switch (event.type) {
      case ItineraryEventType.WALK: {
        const walkEvent = event as WalkEvent;
        if (walkEvent.toPosition.x > walkEvent.fromPosition.x) facingDirection = 'right';
        else if (walkEvent.toPosition.x < walkEvent.fromPosition.x) facingDirection = 'left';
        bodyOrientation = 'standing';

        const endTime = walkEvent.startTime + walkEvent.duration;
        position = time < endTime
          ? _interpolatePosition(walkEvent.fromPosition, walkEvent.toPosition, clamp((time - walkEvent.startTime) / walkEvent.duration, 0, 1))
          : duplicatePosition(walkEvent.toPosition);
        break;
      }
      case ItineraryEventType.DIE:
        isAlive = false;
        break;
      case ItineraryEventType.FACE:
        facingDirection = (event as FaceEvent).facingDirection;
        break;
      case ItineraryEventType.BODY_ORIENTATION:
        bodyOrientation = (event as BodyOrientationEvent).bodyOrientation;
        break;
      case ItineraryEventType.SPEECH: {
        const speechEvent = event as SpeechEvent;
        speech = time < speechEvent.startTime + speechEvent.duration ? speechEvent.speech : null;
        break;
      }
      case ItineraryEventType.THOUGHT: {
        const thoughtEvent = event as ThoughtEvent;
        thought = time < thoughtEvent.startTime + thoughtEvent.duration ? thoughtEvent.thought : null;
        break;
      }
      case ItineraryEventType.EMIT:
      case ItineraryEventType.CHARACTER_ENCOUNTER:
      case ItineraryEventType.TAKE_ITEM:
      case ItineraryEventType.DROP_ITEM:
      case ItineraryEventType.GIVE_ITEM:
      case ItineraryEventType.SHOW:
      case ItineraryEventType.HIDE:
      case ItineraryEventType.LOCK:
      case ItineraryEventType.UNLOCK:
      case ItineraryEventType.ROOM_ENTRY:
        break;
      default:
        assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
    }
  }

  return {
    position,
    isAlive,
    facingDirection,
    bodyOrientation,
    speech,
    thought
  };
}

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position):Position {
  switch(event.type) {
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.DIE:
    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.FACE:
    case ItineraryEventType.BODY_ORIENTATION:
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.EMIT:
    case ItineraryEventType.THOUGHT:
    case ItineraryEventType.CHARACTER_ENCOUNTER:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
    case ItineraryEventType.SHOW:
    case ItineraryEventType.HIDE:
    case ItineraryEventType.LOCK:
    case ItineraryEventType.UNLOCK:
      return duplicatePosition(eventStartPosition);
    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  assert(interpolateAmount >= 0);
  assert(interpolateAmount <= 2);
  const vector = {x:toPosition.x - fromPosition.x, y:toPosition.y - fromPosition.y};
  return {
    x:fromPosition.x + (interpolateAmount * vector.x),
    y:fromPosition.y + (interpolateAmount * vector.y),
    z:fromPosition.z + (interpolateAmount * (toPosition.z - fromPosition.z))
  }
}

export function findCharacterPose(character:Character, time:number):CharacterPose {
  if (!character.itinerary.length || !character.itineraryIndex.eventStartTimes.length) {
    return {
      position:duplicatePosition(character.position),
      isAlive:character.isAlive,
      facingDirection:character.facingDirection,
      bodyOrientation:character.bodyOrientation,
      speech:null,
      thought:null
    };
  }
  return _findItineraryPose(character, time);
}

export function createItineraryIndex(events:ItineraryEvent[], initialPosition?:Position):ItineraryIndex {
  if (!events.length) {
    return { eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[0] };
  }
  const eventStartPositions:Position[] = [];
  const firstWalkEvent = events.find(event => event.type === ItineraryEventType.WALK) as WalkEvent|undefined;
  let currentPosition:Position|null = initialPosition ? duplicatePosition(initialPosition) : duplicatePosition(firstWalkEvent?.fromPosition || { x:0, y:0, z:ROOM_BACK_Z });
  if (!initialPosition) assertNonNullable(firstWalkEvent);

  for (let i = 0; i < events.length; ++i) {
    const event = events[i];
    assertNonNullable(event);
    assertNonNullable(currentPosition);
    eventStartPositions.push(duplicatePosition(currentPosition));
    currentPosition = _getEventEndPosition(event, currentPosition);
  }

  const roomEntryStartTimes = events
    .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
    .map(event => event.startTime);

  return {
    eventStartTimes:events.map(event => event.startTime),
    eventStartPositions,
    roomEntryStartTimes:roomEntryStartTimes[0] === 0 ? roomEntryStartTimes : [0, ...roomEntryStartTimes]
  };
}

function _findNextValue(values:ReadonlyArray<number>, time:number):number|null {
  for (const value of values) {
    if (value > time) return value;
  }
  return null;
}

function _findPreviousValue(values:ReadonlyArray<number>, time:number):number|null {
  for (let i = values.length - 1; i >= 0; --i) {
    if (values[i] < time) return values[i];
  }
  return null;
}

export function findNextRoomEntryTime(character:Character, time:number):number|null {
  return _findNextValue(character.itineraryIndex.roomEntryStartTimes, time);
}

export function findPreviousRoomEntryTime(character:Character, time:number):number|null {
  return _findPreviousValue(character.itineraryIndex.roomEntryStartTimes, time);
}