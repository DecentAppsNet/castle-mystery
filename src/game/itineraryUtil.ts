import { assert, assertNonNullable } from "decent-portal";
import Itinerary from "./types/Itinerary";
import Level from "./types/Level";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import SpeechEvent from "./types/itineraryEvents/SpeechEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position, { duplicatePosition } from "./types/Position";
import Character from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { rand, randIntInRange } from "@/common/randUtil";
import { findRoomAtPosition, findRoomNearestToPosition } from "./roomUtil";
import RoomExit from "./types/RoomExit";
import ItineraryIndex from "./types/ItineraryIndex";

const WALK_MSECS_PER_PIXEL = 30;
const SPEECH_ACTIVITY_PROBABILITY = .03;
const MIN_SPEECH_TIME = MSECS_IN_SECOND;
const SPEECH_MSECS_PER_CHARACTER = 90;

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
  SPEECH = 'speech'
}

function _getRandomActivity():Activity {
  const r = rand();
  if (r < SPEECH_ACTIVITY_PROBABILITY) return Activity.SPEECH;
  if (r < .3) return Activity.WAIT;
  if (r < .9) return Activity.MOVE_IN_ROOM;
  return Activity.EXIT_ROOM;
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

const LEFT_RIGHT_MARGIN = 5;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 5;
function _getRandomPositionInRoom(room:Room):[x:number, y:number] {
  const x = room.rect.x + LEFT_RIGHT_MARGIN + randIntInRange(0, room.rect.width - LEFT_RIGHT_MARGIN * 2);
  const y = room.rect.y + TOP_MARGIN + randIntInRange(0, room.rect.height - TOP_MARGIN - BOTTOM_MARGIN);
  return [x, y];
}

function _calcWalkDuration(fromX:number, fromY:number, toX:number, toY:number):number {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  return Math.floor(distance * WALK_MSECS_PER_PIXEL);
}

function _calcFacingAngle(fromX:number, fromY:number, toX:number, toY:number):number {
  return Math.atan2(toY - fromY, toX - fromX);
}

function _createWalkEvent(startTime:number, fromX:number, fromY:number, toX:number, toY:number):WalkEvent {
  const duration = _calcWalkDuration(fromX, fromY, toX, toY);
  assert(duration > 0);
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:{x:fromX, y:fromY},
    toPosition:{x:toX, y:toY},
    facingAngle:_calcFacingAngle(fromX, fromY, toX, toY),
    duration
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
  let toX:number, toY:number;
  do {
    [toX, toY] = _getRandomPositionInRoom(room);
  } while (toX === x && toY === y);
  return _createWalkEvent(startTime, x, y, toX, toY);
}

function _findCharactersInSameRoomAtTime(level:Level, room:Room, time:number):Character[] {
  return level.characters.filter(character => {
    const position = findCharacterPosition(character, time);
    const characterRoom = findRoomAtPosition(level.rooms, position.x, position.y);
    return characterRoom?.id === room.id;
  });
}

function _createRandomSpeechEvent(level:Level, x:number, y:number, startTime:number, currentFacingAngle:number):SpeechEvent {
  const room = _findRoomAtPosition(level.rooms, x, y);
  const otherCharacters = _findCharactersInSameRoomAtTime(level, room, startTime);
  if (!otherCharacters.length) return _createSpeechEvent(startTime, _pickRandom(MUSING_SPEECHES), currentFacingAngle);

  const targetCharacter = _pickRandom(otherCharacters);
  const targetPosition = findCharacterPosition(targetCharacter, startTime);
  return _createSpeechEvent(
    startTime,
    _pickRandom(CONVERSATION_SPEECHES),
    _calcFacingAngle(x, y, targetPosition.x, targetPosition.y)
  );
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

function _createExitRoomRandomWalkEvents(rooms:Room[], x:number, y:number, startTime:number):WalkEvent[] {
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
  const approachEvent = _createWalkEvent(startTime, x, y, approachPosition.x, approachPosition.y);
  const destinationEvent = _createWalkEvent(
    startTime + approachEvent.duration,
    approachPosition.x,
    approachPosition.y,
    destinationPosition.x,
    destinationPosition.y
  );
  return [approachEvent, destinationEvent];
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

function _getEventEndPosition(event:ItineraryEvent, eventStartPosition:Position):Position {
  switch(event.type) {
    case ItineraryEventType.WALK:
      return duplicatePosition((event as WalkEvent).toPosition);
    case ItineraryEventType.SPEECH:
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
        const elapsedFactor = clamp((time - event.startTime) / event.duration, 0, 1);
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

    default:
      assert(false, `unsupported itinerary event type ${(event as ItineraryEvent).type}`);
  }
}

export function createItineraryIndex(events:ItineraryEvent[]):ItineraryIndex {
  assert(events.length > 0);
  assert(events[0].startTime === 0);
  const eventStartPositions:Position[] = [];
  let currentPosition:Position|null = null;

  for (let i = 0; i < events.length; ++i) {
    const event = events[i];
    assertNonNullable(event);
    if (i === 0) {
      assert(event.type === ItineraryEventType.WALK);
      currentPosition = duplicatePosition((event as WalkEvent).fromPosition);
    }
    assertNonNullable(currentPosition);
    eventStartPositions.push(duplicatePosition(currentPosition));
    currentPosition = _getEventEndPosition(event, currentPosition);
  }

  return {
    eventStartTimes:events.map(event => event.startTime),
    eventStartPositions
  };
}

export function findCharacterPosition(character:Character, time:number):Position {
  return findCharacterPose(character, time).position;
}

export function generateRandomItinerary(level:Level, characterX:number, characterY:number, duration:number):Itinerary {
  const itinerary:Itinerary = [];
  let time = 0; // Start of day.
  let x = characterX;
  let y = characterY;
  let facingAngle = 0;
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
          const lastEvent = events[events.length - 1];
          assertNonNullable(lastEvent);
          time = lastEvent.startTime + lastEvent.duration;
          x = lastEvent.toPosition.x;
          y = lastEvent.toPosition.y;
          facingAngle = lastEvent.facingAngle;
        }
      break;

      case Activity.SPEECH:
        {
          const event = _createRandomSpeechEvent(level, x, y, time, facingAngle);
          itinerary.push(event);
          time += event.duration;
          facingAngle = event.facingAngle;
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