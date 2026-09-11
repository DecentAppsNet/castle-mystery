import { areRoomsConnected, findRoomAtPosition, findRoomIdAtPosition } from "@/game/roomUtil";
import Position from "@/game/types/Position";
import Room from "@/game/types/Room";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { assert, assertNonNullable } from "decent-portal";
import RoomEntryEvents from "./types/RoomEntryEvents";

const RIGHT = 1, LEFT = -1;
type DIRECTION = 1|-1;

// Check for trivial disqualification for room-entrance consideration.
function _couldMovementSpanRooms(fromPosition:Position, toPosition:Position):boolean {
  // Coupled to knowledge that it is only possible to enter a room traveling purely horizontally between two waypoints.
  return (fromPosition.x !== toPosition.x && fromPosition.y === toPosition.y && fromPosition.z === toPosition.z);
}

const INSIDE_LEFT_ROOM_OFFSET = .0001;
function _nextRoomX(room:Room, direction:DIRECTION):number {
  return direction === RIGHT 
    ? room.rect.x + room.rect.width 
    : room.rect.x - INSIDE_LEFT_ROOM_OFFSET; // The offset puts the X value inside the leftward room.
}

function _findRoomsInDirection(toPosition:Position, rooms:Room[], fromRoom:Room, y:number, direction:DIRECTION):Room[] {
  const foundRooms:Room[] = [];
  let lastRoom:Room|null = fromRoom;
  let x = _nextRoomX(lastRoom, direction);
  let iterationCount = 0; // Shouldn't need to check, but infinite loops will hang a browser.
  while((direction > 0 ? x <= toPosition.x : x >= toPosition.x) && ++iterationCount <= rooms.length) {
    const room = findRoomAtPosition(rooms, x, y);
    assertNonNullable(room);
    assert(areRoomsConnected(lastRoom, room)); // Earlier path generation should only have moved character through connected rooms.
    foundRooms.push(room);
    x = _nextRoomX(room, direction);
    lastRoom = room;
  }
  return foundRooms;
}

function _findRightwardRooms(fromPosition:Position, toPosition:Position, rooms:Room[], fromRoom:Room):Room[] {
  return _findRoomsInDirection(toPosition, rooms, fromRoom, fromPosition.y, RIGHT);
}

function _findLeftwardRooms(fromPosition:Position, toPosition:Position, rooms:Room[], fromRoom:Room):Room[] {
  return _findRoomsInDirection(toPosition, rooms, fromRoom, fromPosition.y, LEFT);
}

function _generateRoomEntriesFromCrossedRooms(fromPosition:Position, toPosition:Position, 
  fromTime:number, toTime:number, crossedRooms:Room[]):RoomEntryEvents {
  const movementX = toPosition.x - fromPosition.x;
  assert(movementX !== 0);
  return crossedRooms.map(room => {
    const entranceX = movementX > 0 ? room.rect.x : room.rect.x + room.rect.width;
    const elapsedRatio = (entranceX - fromPosition.x) / movementX;
    assert(elapsedRatio >= 0 && elapsedRatio <= 1);
    return {
      roomId:room.id,
      time:fromTime + (toTime - fromTime) * elapsedRatio
    };
  });
}

function _generateRoomEntriesBetweenPositions(fromPosition:Position, toPosition:Position, fromTime:number, 
  toTime:number, rooms:Room[], fromRoom:Room):RoomEntryEvents {
  assert(fromPosition.x !== toPosition.x && fromPosition.y === toPosition.y && fromPosition.z === toPosition.z);
  
  const seekDirection = Math.sign(toPosition.x - fromPosition.x);
  assert(seekDirection === LEFT || seekDirection === RIGHT);
  const crossedRooms = seekDirection === RIGHT
    ? _findRightwardRooms(fromPosition, toPosition, rooms, fromRoom) 
    : _findLeftwardRooms(fromPosition, toPosition, rooms, fromRoom);
  
  return _generateRoomEntriesFromCrossedRooms(fromPosition, toPosition, fromTime, toTime, crossedRooms);
}

function _generateRoomEntryEventsForCharacter(keyframes:TimelineKeyframe[], characterI:number, rooms:Room[]):RoomEntryEvents {
  const events:RoomEntryEvents = [];

  // Add the first room.
  const firstCharacterKeyframe = keyframes[0].characters[characterI];
  let lastPosition = firstCharacterKeyframe.position;
  const roomId = findRoomIdAtPosition(rooms, lastPosition.x, lastPosition.y);
  let lastTime = keyframes[0].time;
  assertNonNullable(roomId);
  events.push({roomId, time:lastTime});
  
  for (let keyframeI = 1; keyframeI < keyframes.length; ++keyframeI) {
    const keyframe = keyframes[keyframeI];
    const characterKeyframe = keyframe.characters[characterI];
    const { position } = characterKeyframe;
    const { time } = keyframe;
    if (_couldMovementSpanRooms(lastPosition, position)) {
      const fromRoom = findRoomAtPosition(rooms, lastPosition.x, lastPosition.y);
      assertNonNullable(fromRoom);
      const roomIntersections = _generateRoomEntriesBetweenPositions(lastPosition, position, lastTime, time, rooms, fromRoom);
      events.push(...roomIntersections);
    }

    lastPosition = position;
    lastTime = time;
  }

  return events;
}

export function generateRoomEntryEvents(keyframes:TimelineKeyframe[], rooms:Room[]):RoomEntryEvents[] {
  const perCharacterEntryEvents:RoomEntryEvents[] = [];
  const characterCount = keyframes[0].characters.length;
  for(let characterI = 0; characterI < characterCount; ++characterI) {
    perCharacterEntryEvents.push(_generateRoomEntryEventsForCharacter(keyframes, characterI, rooms));
  }
  return perCharacterEntryEvents;
}