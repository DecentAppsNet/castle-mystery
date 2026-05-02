import { assert, assertNonNullable } from "decent-portal";
import Itinerary from "./types/Itinerary";
import Level from "./types/Level";
import Room from "./types/Room";
import WalkEvent from "./types/itineraryEvents/WalkEvent";
import ItineraryEventType from "./types/itineraryEvents/ItineraryEventType";
import ItineraryEvent from "./types/itineraryEvents/ItineraryEvent";
import Coord from "./types/Coord";
import Character from "./types/Character";
import { MINUTES_IN_DAY, MSECS_IN_DAY, MSECS_IN_MINUTE } from "@/common/timeUtil";
import { clamp } from "@/common/numberUtil";
import { findRoomAtCoords, findRoomNearestToCoords } from "./roomUtil";

const WALK_MSECS_PER_PIXEL = 10; // Takes 1 second to walk a hundred pixels.
const SCRUB_COORD_COUNT = MINUTES_IN_DAY;

enum Activity {
  WAIT = 'wait',
  MOVE_IN_ROOM = 'move',
  EXIT_ROOM = 'exitRoom'
}

function _getRandomActivity():Activity {
  const r = Math.random();
  if (r < .4) return Activity.WAIT;
  if (r < .9) return Activity.MOVE_IN_ROOM;
  return Activity.EXIT_ROOM;
}

const MAX_WAIT_TIME = 10 * MSECS_IN_MINUTE;
function _getRandomWaitTime():number {
  return Math.floor(Math.random() * MAX_WAIT_TIME);
}

function _getRandomCoordsInRoom(room:Room):[x:number, y:number] {
  const x = room.rect.x + Math.floor(Math.random() * room.rect.width);
  const y = room.rect.y + Math.floor(Math.random() * room.rect.height);
  return [x, y];
}

function _calcWalkDuration(fromX:number, fromY:number, toX:number, toY:number):number {
  const distance = Math.sqrt((toX - fromX)**2 + (toY - fromY)**2);
  return distance * WALK_MSECS_PER_PIXEL;
}

function _findRoomAtCoords(rooms:Room[], x:number, y:number):Room {
  let room = findRoomAtCoords(rooms, x, y);
  if (!room) {
    console.warn(`Coords (${x}, ${y}) are not in a room.`);
    room = findRoomNearestToCoords(rooms, x, y); // Don't know what happened, but try to be robust.
    assertNonNullable(room);
  }
  return room;
}

function _createInRoomRandomWalkEvent(rooms:Room[], x:number, y:number, startTime:number):WalkEvent {
  const room = _findRoomAtCoords(rooms, x, y);
  const [toX, toY] = _getRandomCoordsInRoom(room);
  const duration = _calcWalkDuration(x, y, toX, toY);
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:{x, y},
    toPosition:{x:toX, y:toY},
    duration
  }
}

const EXIT_CLEARANCE_PIXELS = 10;
function _createExitRoomRandomWalkEvent(rooms:Room[], x:number, y:number, startTime:number):WalkEvent {
  const room = _findRoomAtCoords(rooms, x, y);
  if (!room.exits.length) return _createInRoomRandomWalkEvent(rooms, x, y, startTime);
  const toExit = room.exits[Math.floor(Math.random() * room.exits.length)];
  assertNonNullable(toExit);

  // Find the angle of travel from x, y to the exit. Set dx and dy to go past the exit by EXIT_CLEARANCE_PIXELS
  // following hte same angle of travel.
  const angle = Math.atan2(toExit.y - y, toExit.x - x);
  const dx = Math.cos(angle) * EXIT_CLEARANCE_PIXELS;
  const dy = Math.sin(angle) * EXIT_CLEARANCE_PIXELS;
  const toX = Math.round(toExit.x + dx);
  const toY = Math.round(toExit.y + dy);
  const duration = _calcWalkDuration(x, y, toX, toY);
  return {
    type:ItineraryEventType.WALK,
    startTime,
    fromPosition:{x, y},
    toPosition:{x:toX, y:toY},
    duration
  };
}

function _findLastEventNoPrecedingTime(events:ItineraryEvent[], time:number, fromEventNo:number):number {
  assert(events.length > 0);
  assert(events[0].startTime === 0);
  assert(time >= 0);
  let eventNo = fromEventNo;
  while(eventNo < events.length && events[eventNo].startTime <= time) { ++eventNo; }
  assert(eventNo > 0); // Because the first event is 0 and the time is >= 0, eventNo should have advanced.
  return --eventNo;
}

function _interpolateCoords(fromPosition:Coord, toPosition:Coord, interpolateAmount:number):Coord {
  const vector = {x:toPosition.x - fromPosition.x, y:toPosition.y - fromPosition.y};
  return {
    x:Math.floor(fromPosition.x + (interpolateAmount * vector.x)),
    y:Math.floor(fromPosition.y + (interpolateAmount * vector.y))
  }
}

export function generateScrubCoords(events:ItineraryEvent[]):Coord[] {
  assert(events.length > 0);
  assert(events[0].startTime === 0);
  const coords:Coord[] = [];
  const stepCount = SCRUB_COORD_COUNT;
  const duration = MSECS_IN_DAY;
  const stepDuration = duration / stepCount;
  let eventNo = 0;

  for(let stepNo = 0; stepNo < stepCount; ++stepNo) {
    // Find first event that starts after the scrub time.
    const scrubTime = stepNo * stepDuration;
    eventNo = _findLastEventNoPrecedingTime(events, scrubTime, eventNo);
    const precedingEvent:WalkEvent = events[eventNo] as WalkEvent;
    assert(precedingEvent.type === ItineraryEventType.WALK); // Will need to change code below if more event types added.
    const elapsedFactor = (scrubTime - precedingEvent.startTime) / duration;
    const position = _interpolateCoords(precedingEvent.fromPosition, precedingEvent.toPosition, elapsedFactor);
    coords.push(position);
  }

  return coords;
}

function _timeToScrubI(time:number):number {
  time = clamp(time, 0, MSECS_IN_DAY);
  return Math.floor(SCRUB_COORD_COUNT * (time / MSECS_IN_DAY));
}

export function findCharacterScrubCoords(character:Character, time:number):Coord {
  const scrubI = _timeToScrubI(time);
  return character.scrubCoords[scrubI];
}

export function generateRandomItinerary(level:Level, characterX:number, characterY:number):Itinerary {
  const itinerary:Itinerary = [];
  let time = 0; // Start of day.
  let x = characterX;
  let y = characterY;
  while(time < MSECS_IN_DAY) {
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