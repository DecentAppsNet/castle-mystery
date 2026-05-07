import { assert, assertNonNullable } from "decent-portal";
import Itinerary from "./types/Itinerary";
import Level from "./types/Level";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import RoomEntryEvent from "./types/itineraryEvents/RoomEntryEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import TakeItemEvent from "./types/itineraryEvents/TakeItemEvent";
import DropItemEvent from "./types/itineraryEvents/DropItemEvent";
import GiveItemEvent from "./types/itineraryEvents/GiveItemEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import Item, { duplicateItem } from "./types/Item";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { rand, randIntInRange } from "@/common/randUtil";
import { findRoomAtPosition, findRoomNearestToPosition } from "./roomUtil";
import RoomExit from "./types/RoomExit";
import ItineraryIndex from "./types/ItineraryIndex";
import { clipMoveToObstructions, isPositionWithinRoomObstructionMargin } from "./obstructionUtil";

const WALK_MSECS_PER_PIXEL = 30;
const SPEECH_ACTIVITY_PROBABILITY = .03;
const WAIT_ACTIVITY_PROBABILITY = .25;
const MOVE_IN_ROOM_ACTIVITY_PROBABILITY = .55;
const EXIT_ROOM_ACTIVITY_PROBABILITY = .10;
const TRANSFER_ITEM_ACTIVITY_PROBABILITY = .07;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;
const TRANSFER_ITEM_NEARBY_DISTANCE = 8;
const MIN_ACTIVITY_TIME = 1;

type CharacterPose = {
  position:Position,
  facingAngle:number,
  speech:string|null
}

const MUSING_SPEECHES = [
  "I'm very busy.",
  "This is my favorite room.",
  "Why am I the only one here?",
  "I should tidy this place.",
  "Something feels off today.",
  "I could use a nap.",
  "I hope no one interrupts me.",
  "There has to be a clue nearby.",
  "I keep thinking about dinner.",
  "I know I left something here."
];

const CONVERSATION_SPEECHES = [
  "Hello!",
  "Why are you here?",
  "Did you hear that?",
  "Please keep your voice down.",
  "You look suspicious.",
  "Can I ask you something?",
  "Stay where I can see you.",
  "This room is off limits.",
  "I need your attention.",
  "What are you doing here?"
];

enum Activity {
  WAIT = 'wait',
  MOVE_IN_ROOM = 'move',
  EXIT_ROOM = 'exitRoom',
  SPEECH = 'speech',
  TRANSFER_ITEM = 'transferItem'
}

function _getRandomActivity():Activity {
  const r = rand();
  let cutoff = SPEECH_ACTIVITY_PROBABILITY;
  if (r < cutoff) return Activity.SPEECH;
  cutoff += WAIT_ACTIVITY_PROBABILITY;
  if (r < cutoff) return Activity.WAIT;
  cutoff += MOVE_IN_ROOM_ACTIVITY_PROBABILITY;
  if (r < cutoff) return Activity.MOVE_IN_ROOM;
  cutoff += EXIT_ROOM_ACTIVITY_PROBABILITY;
  if (r < cutoff) return Activity.EXIT_ROOM;
  cutoff += TRANSFER_ITEM_ACTIVITY_PROBABILITY;
  if (r < cutoff) return Activity.TRANSFER_ITEM;
  return Activity.WAIT;
}

function _pickRandom<T>(items:T[]):T {
  assert(items.length > 0);
  const item = items[randIntInRange(0, items.length)];
  assertNonNullable(item);
  return item;
}

const MAX_WAIT_TIME = 2 * MSECS_IN_SECOND;
function _getRandomWaitTime():number {
  let v = randIntInRange(0, MAX_WAIT_TIME);
  assert(v < MAX_WAIT_TIME);
  return v;
}

function _calcSpeechDuration(speech:string):number {
  return clamp(speech.length * SPEECH_MSECS_PER_CHARACTER, MIN_SPEECH_TIME, Number.POSITIVE_INFINITY);
}

function _calcDistance(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.hypot(toX - fromX, toY - fromY);
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

  assert(false, `unable to find unobstructed position in room ${room.id}`);
}

function _calcWalkDuration(fromX:number, fromY:number, toX:number, toY:number):number {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _calcFacingAngle(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.atan2(toY - fromY, toX - fromX);
}

type WalkEventCreationResult = {
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
      facingAngle:_calcFacingAngle(fromX, fromY, finalToPosition.x, finalToPosition.y),
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

function _createTakeItemEvent(startTime:number, itemId:string):TakeItemEvent {
  return { type:ItineraryEventType.TAKE_ITEM, startTime, itemId };
}

function _createDropItemEvent(startTime:number, itemId:string, position:Position):DropItemEvent {
  return { type:ItineraryEventType.DROP_ITEM, startTime, itemId, position:duplicatePosition(position) };
}

function _createGiveItemEvent(startTime:number, itemId:string, recipientCharacterId:string):GiveItemEvent {
  return { type:ItineraryEventType.GIVE_ITEM, startTime, itemId, recipientCharacterId };
}

function _createRoomEntryEvent(startTime:number, roomId:string):RoomEntryEvent {
  return { type:ItineraryEventType.ROOM_ENTRY, startTime, roomId };
}

function _findRoomAtPosition(rooms:Room[], x:number, y:number):Room {
  let room = findRoomAtPosition(rooms, x, y);
  if (!room) {
    console.warn(`Position (${x}, ${y}) is not in a room.`);
    room = findRoomNearestToPosition(rooms, x, y); // Don't know what happened, but try to be robust.
    assertNonNullable(room);
  }
  return room;
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

  assert(false, `unable to create unobstructed in-room walk from (${x}, ${y})`);
}

function _findCharacterPositionAtTimeOrCurrent(character:Character, time:number):Position {
  if (!character.itinerary.length) return { x:character.x, y:character.y };
  return findCharacterPosition(character, time);
}

function _findCharactersInSameRoomAtTime(level:Level, room:Room, time:number, excludedCharacterId?:string):Character[] {
  return level.characters.filter(character => {
    if (excludedCharacterId && character.id === excludedCharacterId) return false;
    const position = _findCharacterPositionAtTimeOrCurrent(character, time);
    const characterRoom = findRoomAtPosition(level.rooms, position.x, position.y);
    return characterRoom?.id === room.id;
  });
}

function _createRandomSpeechEvent(level:Level, characterId:string, x:number, y:number, startTime:number, currentFacingAngle:number):SpeechEvent {
  const room = _findRoomAtPosition(level.rooms, x, y);
  const otherCharacters = _findCharactersInSameRoomAtTime(level, room, startTime, characterId);
  if (!otherCharacters.length) return _createSpeechEvent(startTime, _pickRandom(MUSING_SPEECHES), currentFacingAngle);

  const targetCharacter = _pickRandom(otherCharacters);
  const targetPosition = _findCharacterPositionAtTimeOrCurrent(targetCharacter, startTime);
  return _createSpeechEvent(
    startTime,
    _pickRandom(CONVERSATION_SPEECHES),
    _calcFacingAngle(x, y, targetPosition.x, targetPosition.y)
  );
}

function _getOrCreateRoomItemState(roomItemsByRoomId:Map<string, Item[]>, room:Room):Item[] {
  const existingItems = roomItemsByRoomId.get(room.id);
  if (existingItems) return existingItems;
  const nextItems = room.items.map(duplicateItem);
  roomItemsByRoomId.set(room.id, nextItems);
  return nextItems;
}

function _removeItemById(items:Item[], itemId:string):Item|null {
  const itemIndex = items.findIndex(item => item.id === itemId);
  if (itemIndex === -1) return null;
  const [item] = items.splice(itemIndex, 1);
  return item ?? null;
}

function _findNearbyCharacters(level:Level, currentCharacter:Character, room:Room, time:number, x:number, y:number):Character[] {
  return _findCharactersInSameRoomAtTime(level, room, time, currentCharacter.id).filter(character => {
    const position = _findCharacterPositionAtTimeOrCurrent(character, time);
    return _calcDistance(x, y, position.x, position.y) <= TRANSFER_ITEM_NEARBY_DISTANCE;
  });
}

function _findNearbyItems(items:Item[], x:number, y:number):Item[] {
  return items.filter(item => _calcDistance(x, y, item.position.x, item.position.y) <= TRANSFER_ITEM_NEARBY_DISTANCE);
}

function _createTransferItemEvents(level:Level, currentCharacter:Character, roomItemsByRoomId:Map<string, Item[]>, carriedItems:Item[],
  x:number, y:number, startTime:number):ItineraryEvent[] {
  const room = _findRoomAtPosition(level.rooms, x, y);
  const roomItems = _getOrCreateRoomItemState(roomItemsByRoomId, room);
  const nearbyCharacters = _findNearbyCharacters(level, currentCharacter, room, startTime, x, y);
  if (nearbyCharacters.length > 0 && carriedItems.length > 0) {
    const item = _pickRandom(carriedItems);
    const recipient = _pickRandom(nearbyCharacters);
    _removeItemById(carriedItems, item.id);
    return [_createGiveItemEvent(startTime, item.id, recipient.id)];
  }

  const nearbyItems = _findNearbyItems(roomItems, x, y);
  if (nearbyItems.length > 0) {
    const item = _pickRandom(nearbyItems);
    const takenItem = _removeItemById(roomItems, item.id);
    if (takenItem) carriedItems.push(takenItem);
    return [_createTakeItemEvent(startTime, item.id)];
  }

  if (roomItems.length > 0) {
    const item = _pickRandom(roomItems);
    const walkResult = _createWalkEvent(room, startTime, x, y, item.position.x, item.position.y);
    if (!walkResult.event) return [];
    const events:ItineraryEvent[] = [walkResult.event];
    const reachedItem = walkResult.event.toPosition.x === item.position.x && walkResult.event.toPosition.y === item.position.y;
    if (walkResult.wasClipped || !reachedItem) return events;
    const takenItem = _removeItemById(roomItems, item.id);
    if (takenItem) carriedItems.push(takenItem);
    events.push(_createTakeItemEvent(startTime + walkResult.event.duration, item.id));
    return events;
  }

  if (carriedItems.length > 0) {
    const item = _pickRandom(carriedItems);
    const droppedItem = _removeItemById(carriedItems, item.id);
    if (droppedItem) roomItems.push({ ...droppedItem, position:{ x, y } });
    return [_createDropItemEvent(startTime, item.id, { x, y })];
  }

  return [];
}

const EXIT_CLEARANCE_PIXELS = 3;
function _calcExitClearanceOffsets(room:Room, exit:RoomExit):[dx:number, dy:number] {
  let dx = 0, dy = 0;
  if (exit.x === room.rect.x) {
    dx = -EXIT_CLEARANCE_PIXELS;
  } else if (exit.x === room.rect.x + room.rect.width) {
    dx = EXIT_CLEARANCE_PIXELS;
  } else if (exit.y === room.rect.y) {
    dy = -EXIT_CLEARANCE_PIXELS;
  } else {
    assert(exit.y === room.rect.y + room.rect.height);
    dy = EXIT_CLEARANCE_PIXELS;
  }
  return [dx, dy];
}

function _calcExitApproachPosition(room:Room, exit:RoomExit):Position {
  const [dx, dy] = _calcExitClearanceOffsets(room, exit);
  return {
    x: Math.round(exit.x - dx),
    y: Math.round(exit.y - dy)
  };
}

function _calcExitDestinationPosition(room:Room, exit:RoomExit):Position {
  const [dx, dy] = _calcExitClearanceOffsets(room, exit);
  return {
    x: Math.round(exit.x + dx),
    y: Math.round(exit.y + dy)
  };
}

function _createExitRoomRandomWalkEvents(rooms:Room[], x:number, y:number, startTime:number):ItineraryEvent[] {
  const room = _findRoomAtPosition(rooms, x, y);
  if (!room.exits.length) return [_createInRoomRandomWalkEvent(rooms, x, y, startTime)];
  const candidateExits = room.exits.filter(exit => {
    const approachPosition = _calcExitApproachPosition(room, exit);
    return approachPosition.x !== x || approachPosition.y !== y;
  });
  if (!candidateExits.length) return [_createInRoomRandomWalkEvent(rooms, x, y, startTime)];
  const toExit = candidateExits[randIntInRange(0, candidateExits.length)];
  assertNonNullable(toExit);

  const approachPosition = _calcExitApproachPosition(room, toExit);
  const destinationPosition = _calcExitDestinationPosition(room, toExit);
  const approachResult = _createWalkEvent(room, startTime, x, y, approachPosition.x, approachPosition.y);
  if (!approachResult.event) return [_createInRoomRandomWalkEvent(rooms, x, y, startTime)];
  if (approachResult.wasClipped) return [approachResult.event];

  const destinationRoom = _findRoomAtPosition(rooms, destinationPosition.x, destinationPosition.y);
  assertNonNullable(destinationRoom);

  const destinationResult = _createWalkEvent(
    destinationRoom,
    startTime + approachResult.event.duration,
    approachPosition.x,
    approachPosition.y,
    destinationPosition.x,
    destinationPosition.y
  );
  return destinationResult.event
    ? [
      approachResult.event,
      destinationResult.event,
      _createRoomEntryEvent(destinationResult.event.startTime + destinationResult.event.duration, destinationRoom.id)
    ]
    : [approachResult.event];
}

function _findEventNoForTime(itineraryIndex:ItineraryIndex, time:number):number {
  const { eventStartTimes } = itineraryIndex;
  assert(eventStartTimes.length > 0);
  let low = 0;
  let high = eventStartTimes.length - 1;
  const clampedTime = Math.max(0, time);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (eventStartTimes[mid] <= clampedTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, high);
}

function _getEventDuration(event:ItineraryEvent):number {
  switch(event.type) {
    case ItineraryEventType.WALK: return (event as WalkEvent).duration;
    case ItineraryEventType.ROOM_ENTRY: return 0;
    case ItineraryEventType.SPEECH: return (event as SpeechEvent).duration;
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
      return 0;
    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position):Position {
  switch(event.type) {
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.SPEECH:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
      return duplicatePosition(eventStartPosition);
    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

function _findFacingAngleAtEventStart(itinerary:ItineraryEvent[], eventNo:number):number {
  for (let i = eventNo; i >= 0; --i) {
    const event = itinerary[i];
    assertNonNullable(event);
    switch(event.type) {
      case ItineraryEventType.WALK: return (event as WalkEvent).facingAngle;
      case ItineraryEventType.SPEECH: return (event as SpeechEvent).facingAngle;
      default: continue;
    }
  }
  return 0;
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
  return _findItineraryPosition(character.itinerary, time, character.itineraryIndex);
}

export function _findItineraryPosition(itinerary:ItineraryEvent[], time:number, itineraryIndex:ItineraryIndex):CharacterPose {
  const eventNo = _findEventNoForTime(itineraryIndex, time);
  const event = itinerary[eventNo];
  const eventStartPosition = itineraryIndex.eventStartPositions[eventNo];
  assertNonNullable(event);
  assertNonNullable(eventStartPosition);

  switch(event.type) {
    case ItineraryEventType.WALK:
      {
        const walkEvent = event as WalkEvent;
        const elapsedFactor = clamp((time - walkEvent.startTime) / walkEvent.duration, 0, 1);
        return {
          position:_interpolatePosition(walkEvent.fromPosition, walkEvent.toPosition, elapsedFactor),
          facingAngle:walkEvent.facingAngle,
          speech:null
        };
      }

    case ItineraryEventType.SPEECH:
      {
        const speechEvent = event as SpeechEvent;
      return {
        position:duplicatePosition(eventStartPosition),
        facingAngle:speechEvent.facingAngle,
        speech:time < speechEvent.startTime + speechEvent.duration ? speechEvent.speech : null
      };
      }


    case ItineraryEventType.ROOM_ENTRY:
    case ItineraryEventType.TAKE_ITEM:
    case ItineraryEventType.DROP_ITEM:
    case ItineraryEventType.GIVE_ITEM:
      return {
        position:duplicatePosition(eventStartPosition),
        facingAngle:_findFacingAngleAtEventStart(itinerary, eventNo),
        speech:null
      };

    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

export function createItineraryIndex(events:ItineraryEvent[]):ItineraryIndex {
  assert(events.length > 0);
  assert(events[0].startTime === 0);
  const eventStartPositions:Position[] = [];
  const firstWalkEvent = events.find(event => event.type === ItineraryEventType.WALK) as WalkEvent|undefined;
  assertNonNullable(firstWalkEvent);
  let currentPosition:Position|null = duplicatePosition(firstWalkEvent.fromPosition);

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

function _calcNextTimeAfterEvents(events:ItineraryEvent[]):number {
  const lastEvent = events[events.length - 1];
  assertNonNullable(lastEvent);
  const duration = _getEventDuration(lastEvent);
  return lastEvent.startTime + (duration === 0 ? MIN_ACTIVITY_TIME : duration);
}

function _calcEndPositionAfterEvents(events:ItineraryEvent[], startPosition:Position):Position {
  let currentPosition = duplicatePosition(startPosition);
  for (const event of events) {
    currentPosition = _getEventEndPosition(event, currentPosition);
  }
  return currentPosition;
}

function _findLastFacingAngleAfterEvents(events:ItineraryEvent[], fallbackFacingAngle:number):number {
  for (let i = events.length - 1; i >= 0; --i) {
    const event = events[i];
    switch(event.type) {
      case ItineraryEventType.WALK: return (event as WalkEvent).facingAngle;
      case ItineraryEventType.SPEECH: return (event as SpeechEvent).facingAngle;
    }
  }
  return fallbackFacingAngle;
}

export function generateRandomItinerary(level:Level, character:Character, duration:number):Itinerary {
  const startingRoom = findRoomAtPosition(level.rooms, character.x, character.y);
  assertNonNullable(startingRoom);
  const itinerary:Itinerary = [_createRoomEntryEvent(0, startingRoom.id)];
  const roomItemsByRoomId = new Map(level.rooms.map(room => [room.id, room.items.map(duplicateItem)]));
  const carriedItems = character.items.map(duplicateItem);
  let time = 0; // Start of day.
  let x = character.x;
  let y = character.y;
  let facingAngle = character.facingAngle;
  while(time < duration) {
    const activity = time === 0 ? Activity.MOVE_IN_ROOM : _getRandomActivity();
    switch(activity) {
      case Activity.MOVE_IN_ROOM:
        {
          const event = _createInRoomRandomWalkEvent(level.rooms, x, y, time);
          itinerary.push(event);
          time += event.duration;
          x = event.toPosition.x;
          y = event.toPosition.y;
          facingAngle = event.facingAngle;
        }
      break;

      case Activity.EXIT_ROOM:
        {
          const events = _createExitRoomRandomWalkEvents(level.rooms, x, y, time);
          itinerary.push(...events);
          const endPosition = _calcEndPositionAfterEvents(events, { x, y });
          x = endPosition.x;
          y = endPosition.y;
          facingAngle = _findLastFacingAngleAfterEvents(events, facingAngle);
          time = _calcNextTimeAfterEvents(events);
        }
      break;

      case Activity.SPEECH:
        {
          const event = _createRandomSpeechEvent(level, character.id, x, y, time, facingAngle);
          itinerary.push(event);
          time += event.duration;
          facingAngle = event.facingAngle;
        }
      break;

      case Activity.TRANSFER_ITEM:
        {
          const events = _createTransferItemEvents(level, character, roomItemsByRoomId, carriedItems, x, y, time);
          if (!events.length) {
            time += _getRandomWaitTime();
            break;
          }
          itinerary.push(...events);
          const endPosition = _calcEndPositionAfterEvents(events, { x, y });
          x = endPosition.x;
          y = endPosition.y;
          facingAngle = _findLastFacingAngleAfterEvents(events, facingAngle);
          time = _calcNextTimeAfterEvents(events);
        }
      break;

      default:
        assert(activity === Activity.WAIT);
        time += _getRandomWaitTime();
      break;
    }
  }
  return itinerary;
}