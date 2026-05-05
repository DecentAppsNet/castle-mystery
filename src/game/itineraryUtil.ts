import { assert, assertNonNullable } from "decent-portal";
import Itinerary from "./types/Itinerary";
import Level from "./types/Level";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Position from "./types/Position";
import Character from "./types/Character";
import { MSECS_IN_SECOND } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { rand, randIntInRange } from "@/common/randUtil";
import { findRoomAtPosition, findRoomNearestToPosition } from "./roomUtil";
import RoomExit from "./types/RoomExit";
import ItineraryIndex from "./types/ItineraryIndex";

const WALK_MSECS_PER_PIXEL = 30;

enum Activity {
  WAIT = 'wait',
  MOVE_IN_ROOM = 'move',
  EXIT_ROOM = 'exitRoom'
}

function _getRandomActivity():Activity {
  const r = rand();
  if (r < .3) return Activity.WAIT;
  if (r < .9) return Activity.MOVE_IN_ROOM;
  return Activity.EXIT_ROOM;
}

const MAX_WAIT_TIME = 2 * MSECS_IN_SECOND;
function _getRandomWaitTime():number {
  let v = randIntInRange(0, MAX_WAIT_TIME);
  assert(v < MAX_WAIT_TIME);
  return v;
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

function _createWalkEvent(startTime:number, fromX:number, fromY:number, toX:number, toY:number):WalkEvent {
  const duration = _calcWalkDuration(fromX, fromY, toX, toY);
  assert(duration > 0);
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:{x:fromX, y:fromY},
    toPosition:{x:toX, y:toY},
    duration
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

function _createExitRoomRandomWalkEvent(rooms:Room[], x:number, y:number, startTime:number):WalkEvent {
  const room = _findRoomAtPosition(rooms, x, y);
  if (!room.exits.length) return _createInRoomRandomWalkEvent(rooms, x, y, startTime);
  const candidateExits = room.exits.filter(exit => {
    const [dx, dy] = _calcExitClearanceOffsets(room, exit);
    return Math.round(exit.x + dx) !== x || Math.round(exit.y + dy) !== y;
  });
  if (!candidateExits.length) return _createInRoomRandomWalkEvent(rooms, x, y, startTime);
  const toExit = candidateExits[randIntInRange(0, candidateExits.length)];
  assertNonNullable(toExit);

  const [dx, dy] = _calcExitClearanceOffsets(room, toExit);
  const toX = Math.round(toExit.x + dx);
  const toY = Math.round(toExit.y + dy);
  return _createWalkEvent(startTime, x, y, toX, toY);
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

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  assert(interpolateAmount >= 0);
  assert(interpolateAmount <= 2);
  const vector = {x:toPosition.x - fromPosition.x, y:toPosition.y - fromPosition.y};
  return {
    x:Math.floor(fromPosition.x + (interpolateAmount * vector.x)),
    y:Math.floor(fromPosition.y + (interpolateAmount * vector.y))
  }
}

export function _findItineraryPosition(itinerary:ItineraryEvent[], time:number, itineraryIndex:ItineraryIndex):Position {
  const eventNo = _findEventNoForTime(itineraryIndex, time);
  const precedingEvent:WalkEvent = itinerary[eventNo] as WalkEvent;
  assert(precedingEvent.type === ItineraryEventType.WALK); // Will need to change code below if more event types added.
  const elapsedFactor = clamp((time - precedingEvent.startTime) / precedingEvent.duration, 0, 1);
  return _interpolatePosition(precedingEvent.fromPosition, precedingEvent.toPosition, elapsedFactor);
}

export function createItineraryIndex(events:ItineraryEvent[]):ItineraryIndex {
  assert(events.length > 0);
  assert(events[0].startTime === 0);
  return {
    eventStartTimes:events.map(event => event.startTime)
  };
}

export function findCharacterPosition(character:Character, time:number):Position {
  return _findItineraryPosition(character.itinerary, time, character.itineraryIndex);
}

export function generateRandomItinerary(level:Level, characterX:number, characterY:number, duration:number):Itinerary {
  const itinerary:Itinerary = [];
  let time = 0; // Start of day.
  let x = characterX;
  let y = characterY;
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
        }
      break;

      case Activity.EXIT_ROOM:
        {
          const event = _createExitRoomRandomWalkEvent(level.rooms, x, y, time);
          itinerary.push(event);
          time += event.duration;
          x = event.toPosition.x;
          y = event.toPosition.y;
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