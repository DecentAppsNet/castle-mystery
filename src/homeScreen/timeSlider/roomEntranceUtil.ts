/* This file derives per-character room-entry events from scheduled timeline positions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { findRoomAtPosition, findRoomIdAtPosition } from "@/game/roomUtil";
import { findCrossedRooms } from "@/game/roomTraversalUtil";
import Position from "@/game/types/Position";
import Room from "@/game/types/Room";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { assert, assertNonNullable } from "decent-portal";
import RoomEntryEvents from "./types/RoomEntryEvents";

// Check for trivial disqualification for room-entrance consideration.
function _couldMovementSpanRooms(fromPosition:Position, toPosition:Position):boolean {
  // Coupled to knowledge that it is only possible to enter a room traveling purely horizontally between two waypoints.
  return (fromPosition.x !== toPosition.x && fromPosition.y === toPosition.y && fromPosition.z === toPosition.z);
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
  const crossedRooms = findCrossedRooms(fromPosition, toPosition, rooms, fromRoom);
  
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