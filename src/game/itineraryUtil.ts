import { assert, assertNonNullable } from "decent-portal";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import RoomEntryEvent from "./types/itineraryEvents/RoomEntryEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import ThoughtEvent from "./types/itineraryEvents/ThoughtEvent";
import CharacterEncounterEvent from "./types/itineraryEvents/CharacterEncounterEvent";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import LockEvent from "./types/itineraryEvents/LockEvent";
import UnlockEvent from "./types/itineraryEvents/UnlockEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { findRoomAtPosition, findRoomNearestToPosition } from "./roomUtil";
import ItineraryIndex from "./types/ItineraryIndex";

const WALK_MSECS_PER_PIXEL = 30;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

type CharacterPose = {
  position:Position,
  speech:string|null,
  thought:string|null
}

function _calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

function _calcWalkDuration(fromX:number, fromY:number, toX:number, toY:number):number {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

export type WalkEventCreationResult = {
  event:WalkEvent|null,
  wasClipped:boolean
}

function _findRoomAtPosition(rooms:Room[], x:number, y:number):Room {
  let room = findRoomAtPosition(rooms, x, y);
  if (!room) {
    console.warn(`Position (${x}, ${y}) is not in a room.`);
    room = findRoomNearestToPosition(rooms, x, y); // Don't know what happened, but try to be robust.
  }
  return room;
}

export function createWalkEvent(_room:Room, startTime:number, fromX:number, fromY:number, toX:number, toY:number):WalkEventCreationResult {
  const finalToPosition = { x:toX, y:toY };
  const duration = _calcWalkDuration(fromX, fromY, finalToPosition.x, finalToPosition.y);
  if (duration <= 0) return { event:null, wasClipped:false };
  return {
    event:{
      type:ItineraryEventType.WALK,
      startTime,
      fromPosition:{x:fromX, y:fromY},
      toPosition:finalToPosition,
      duration
    },
    wasClipped:false
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

export function createTakeItemEvent(startTime:number, itemId:string):TakeItemEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, duration:0, itemId };
}

export function createDropItemEvent(startTime:number, itemId:string, position:Position):DropItemEvent {
  return { type:ItineraryEventType.DROP_ITEM, startTime, duration:0, itemId, position:duplicatePosition(position) };
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

export function createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, duration:0, roomId };
}

export function findRoomAtPositionOrNearest(rooms:Room[], x:number, y:number):Room {
  return _findRoomAtPosition(rooms, x, y);
}

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position):Position {
  switch(event.type) {
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.THOUGHT:
    case ItineraryEventType.CHARACTER_ENCOUNTER:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
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
    x:Math.floor(fromPosition.x + (interpolateAmount * vector.x)),
    y:Math.floor(fromPosition.y + (interpolateAmount * vector.y))
  }
}

export function findCharacterPose(character:Character, time:number):CharacterPose {
  if (!character.itinerary.length || !character.itineraryIndex.eventStartTimes.length) {
    return {
      position:{ x:character.x, y:character.y },
      speech:null,
      thought:null
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

function _findThoughtAtTime(itinerary:ItineraryEvent[], time:number):string|null {
  let currentThought:string|null = null;
  for (const event of itinerary) {
    if (event.startTime > time) break;
    if (event.type !== ItineraryEventType.THOUGHT) continue;
    const thoughtEvent = event as ThoughtEvent;
    currentThought = time < thoughtEvent.startTime + thoughtEvent.duration ? thoughtEvent.thought : null;
  }
  return currentThought;
}

function _findItineraryPosition(character:Character, time:number):CharacterPose {
  return {
    position:_findPositionAtTime({ x:character.x, y:character.y }, character.itinerary, time),
    speech:_findSpeechAtTime(character.itinerary, time),
    thought:_findThoughtAtTime(character.itinerary, time)
  };
}

export function createItineraryIndex(events:ItineraryEvent[], initialPosition?:Position):ItineraryIndex {
  if (!events.length) {
    return { eventStartTimes:[], eventStartPositions:[], roomEntryStartTimes:[0] };
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