import { assert, assertNonNullable } from "decent-portal";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import RoomEntryEvent from "./types/itineraryEvents/RoomEntryEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import FacingEvent from "./types/itineraryEvents/FacingEvent";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { randIntInRange } from "@/common/randUtil";
import { findRoomAtPosition, findRoomNearestToPosition } from "./roomUtil";
import ItineraryIndex from "./types/ItineraryIndex";
import { clipMoveToObstructions, isPositionWithinRoomObstructionMargin } from "./obstructionUtil";

const WALK_MSECS_PER_PIXEL = 30;
export const TURN_RADIANS_PER_SECOND = Math.PI * 2;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

type CharacterPose = {
  position:Position,
  facingAngle:number,
  speech:string|null
}

function _calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

const LEFT_RIGHT_MARGIN = 5;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 5;
function _getRandomPositionInRoom(room:Room):[x:number, y:number] {
  for (let attemptNo = 0; attemptNo < 50; ++attemptNo) {
    const x = room.rect.x + LEFT_RIGHT_MARGIN + randIntInRange(0, room.rect.width - LEFT_RIGHT_MARGIN * 2);
    const y = room.rect.y + TOP_MARGIN + randIntInRange(0, room.rect.height - TOP_MARGIN - BOTTOM_MARGIN);
    if (!isPositionWithinRoomObstructionMargin(room, x, y)) return [x, y];
  }

  for (let y = room.rect.y + TOP_MARGIN; y < room.rect.y + room.rect.height - BOTTOM_MARGIN; ++y) {
    for (let x = room.rect.x + LEFT_RIGHT_MARGIN; x < room.rect.x + room.rect.width - LEFT_RIGHT_MARGIN; ++x) {
      if (!isPositionWithinRoomObstructionMargin(room, x, y)) return [x, y];
    }
  }

  throw new Error(`unable to find unobstructed position in room ${room.id}`);
}

function _calcWalkDuration(fromX:number, fromY:number, toX:number, toY:number):number {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _calcFacingAngle(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.atan2(toY - fromY, toX - fromX);
}

function _normalizeAngle(angle:number):number {
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function _calcShortestAngleDelta(fromAngle:number, toAngle:number):number {
  return _normalizeAngle(toAngle - fromAngle);
}

function _calcFacingDuration(fromFacingAngle:number, toFacingAngle:number):number {
  const angleDistance = Math.abs(_calcShortestAngleDelta(fromFacingAngle, toFacingAngle));
  if (angleDistance === 0) return 0;
  return Math.ceil((angleDistance / TURN_RADIANS_PER_SECOND) * MSECS_IN_SECOND);
}

function _interpolateAngle(fromAngle:number, toAngle:number, interpolateAmount:number):number {
  return _normalizeAngle(fromAngle + _calcShortestAngleDelta(fromAngle, toAngle) * interpolateAmount);
}

export type WalkEventCreationResult = {
  event:WalkEvent|null,
  wasClipped:boolean
}

function _createWalkEvent(room:Room, startTime:number, fromX:number, fromY:number, toX:number, toY:number):WalkEventCreationResult {
  const clippedMove = clipMoveToObstructions(room, { x:fromX, y:fromY }, { x:toX, y:toY });
  const finalToPosition = clippedMove.position;
  const duration = _calcWalkDuration(fromX, fromY, finalToPosition.x, finalToPosition.y);
  if (duration <= 0) return { event:null, wasClipped:clippedMove.wasClipped };
  return {
    event:{
      type:ItineraryEventType.WALK,
      startTime,
      fromPosition:{x:fromX, y:fromY},
      toPosition:finalToPosition,
      duration
    },
    wasClipped:clippedMove.wasClipped
  };
}

function _createSpeechEvent(startTime:number, speech:string, facingAngle:number):SpeechEvent {
  return {
    type:ItineraryEventType.SPEECH,
    startTime,
    speech,
    facingAngle,
    duration:_calcSpeechDuration(speech)
  };
}

function _createFacingEvent(startTime:number, fromFacingAngle:number, facingAngle:number):FacingEvent {
  return {
    type:ItineraryEventType.FACING,
    startTime,
    duration:_calcFacingDuration(fromFacingAngle, facingAngle),
    fromFacingAngle,
    facingAngle
  };
}

function _createTakeItemEvent(startTime:number, itemId:string):TakeItemEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, duration:0, itemId };
}

function _createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, duration:0, roomId };
}

function _findRoomAtPosition(rooms:Room[], x:number, y:number):Room {
  let room = findRoomAtPosition(rooms, x, y);
  if (!room) {
    console.warn(`Position (${x}, ${y}) is not in a room.`);
    room = findRoomNearestToPosition(rooms, x, y); // Don't know what happened, but try to be robust.
  }
  return room;
}

export function calcFacingAngle(fromX:number, fromY:number, toX:number, toY:number):number {
  return _calcFacingAngle(fromX, fromY, toX, toY);
}

export function createWalkEvent(room:Room, startTime:number, fromX:number, fromY:number, toX:number, toY:number):WalkEventCreationResult {
  return _createWalkEvent(room, startTime, fromX, fromY, toX, toY);
}

export function createSpeechEvent(startTime:number, speech:string, facingAngle:number):SpeechEvent {
  return _createSpeechEvent(startTime, speech, facingAngle);
}

export function createFacingEvent(startTime:number, fromFacingAngle:number, facingAngle:number):FacingEvent {
  return _createFacingEvent(startTime, fromFacingAngle, facingAngle);
}

export function createTakeItemEvent(startTime:number, itemId:string):TakeItemEvent {
  return _createTakeItemEvent(startTime, itemId);
}

export function createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return _createRoomEntryEvent(startTime, roomId);
}

export function findRoomAtPositionOrNearest(rooms:Room[], x:number, y:number):Room {
  return _findRoomAtPosition(rooms, x, y);
}

function _createInRoomRandomWalkEvent(rooms:Room[], x:number, y:number, startTime:number):WalkEvent {
  const room = _findRoomAtPosition(rooms, x, y);
  for (let attemptNo = 0; attemptNo < 50; ++attemptNo) {
    let toX:number, toY:number;
    do {
      [toX, toY] = _getRandomPositionInRoom(room);
    } while (toX === x && toY === y);
    const result = _createWalkEvent(room, startTime, x, y, toX, toY);
    if (result.event) return result.event;
  }

  throw new Error(`unable to create unobstructed in-room walk from (${x}, ${y})`);
}

export function createInRoomRandomWalkEvent(rooms:Room[], x:number, y:number, startTime:number):WalkEvent {
  return _createInRoomRandomWalkEvent(rooms, x, y, startTime);
}

function _getEventDuration(event:ItineraryEvent):number {
  switch(event.type) {
    case ItineraryEventType.WALK: return (event as WalkEvent).duration;
    case ItineraryEventType.ROOM_ENTRY: return 0;
    case ItineraryEventType.SPEECH: return (event as SpeechEvent).duration;
    case ItineraryEventType.FACING: return 0;
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
      return 0;
    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

export function getEventDuration(event:ItineraryEvent):number {
  return _getEventDuration(event);
}

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position):Position {
  switch(event.type) {
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.FACING:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
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
    x:Math.floor(fromPosition.x + (interpolateAmount * vector.x)),
    y:Math.floor(fromPosition.y + (interpolateAmount * vector.y))
  }
}

export function findCharacterPose(character:Character, time:number):CharacterPose {
  if (!character.itinerary.length || !character.itineraryIndex.eventStartTimes.length) {
    return {
      position:{ x:character.x, y:character.y },
      facingAngle:character.facingAngle,
      speech:null
    };
  }
  return _findItineraryPosition(character, time);
}

function _findPositionAtTime(initialPosition:Position, itinerary:ItineraryEvent[], time:number):Position {
  let currentPosition = duplicatePosition(initialPosition);
  for (const event of itinerary) {
    if (event.type !== ItineraryEventType.WALK) continue;
    const walkEvent = event as WalkEvent;
    if (time < walkEvent.startTime) break;
    const endTime = walkEvent.startTime + walkEvent.duration;
    if (time < endTime) {
      const elapsedFactor = clamp((time - walkEvent.startTime) / walkEvent.duration, 0, 1);
      return _interpolatePosition(walkEvent.fromPosition, walkEvent.toPosition, elapsedFactor);
    }
    currentPosition = duplicatePosition(walkEvent.toPosition);
  }
  return currentPosition;
}

function _findFacingAngleAtTime(initialFacingAngle:number, itinerary:ItineraryEvent[], time:number):number {
  let currentFacingAngle = initialFacingAngle;
  for (const event of itinerary) {
    if (event.type !== ItineraryEventType.FACING) continue;
    if (event.startTime > time) break;
    const facingEvent = event as FacingEvent;
    const endTime = facingEvent.startTime + facingEvent.duration;
    if (time < endTime && facingEvent.duration > 0) {
      const elapsedFactor = clamp((time - facingEvent.startTime) / facingEvent.duration, 0, 1);
      currentFacingAngle = _interpolateAngle(facingEvent.fromFacingAngle, facingEvent.facingAngle, elapsedFactor);
      continue;
    }
    currentFacingAngle = facingEvent.facingAngle;
  }
  return currentFacingAngle;
}

function _findSpeechAtTime(itinerary:ItineraryEvent[], time:number):string|null {
  let currentSpeech:string|null = null;
  for (const event of itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.SPEECH) continue;
    const speechEvent = event as SpeechEvent;
    currentSpeech = time < speechEvent.startTime + speechEvent.duration ? speechEvent.speech : null;
  }
  return currentSpeech;
}

function _findItineraryPosition(character:Character, time:number):CharacterPose {
  return {
    position:_findPositionAtTime({ x:character.x, y:character.y }, character.itinerary, time),
    facingAngle:_findFacingAngleAtTime(character.facingAngle, character.itinerary, time),
    speech:_findSpeechAtTime(character.itinerary, time)
  };
}

export function createItineraryIndex(events:ItineraryEvent[], initialPosition?:Position):ItineraryIndex {
  if (!events.length) {
    return { eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[] };
  }
  const eventStartPositions:Position[] = [];
  const firstWalkEvent = events.find(event => event.type === ItineraryEventType.WALK) as WalkEvent|undefined;
  let currentPosition:Position|null = initialPosition ? duplicatePosition(initialPosition) : duplicatePosition(firstWalkEvent?.fromPosition || { x:0, y:0 });
  if (!initialPosition) assertNonNullable(firstWalkEvent);

  for (let i = 0; i < events.length; ++i) {
    const event = events[i];
    assertNonNullable(event);
    assertNonNullable(currentPosition);
    eventStartPositions.push(duplicatePosition(currentPosition));
    currentPosition = _getEventEndPosition(event, currentPosition);
  }

  return {
    eventStartTimes:events.map(event => event.startTime),
    eventStartPositions,
    roomEntryStartTimes:events
      .filter(event => event.type === ItineraryEventType.ROOM_ENTRY)
      .map(event => event.startTime)
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

export function findCharacterPosition(character:Character, time:number):Position {
  return findCharacterPose(character, time).position;
}