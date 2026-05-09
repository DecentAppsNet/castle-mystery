import { assert, assertNonNullable } from "decent-portal";

import Rect from "./types/Rect";
import Room from "./types/Room";
import Character from "./types/Character";
import RoomExit from "./types/RoomExit";
import Obstruction from "./types/Obstruction";
import Waypoint from "./types/Waypoint";
import { isPathBlockedByObstructions, isPositionInObstructions, isPositionInRect } from "./obstructionUtil";

function _calcAxisWaypointPositions(start:number, length:number):number[] {
  const waypointCount = Math.max(1, Math.ceil(length / WAYPOINT_SPACING));
  const step = length / waypointCount;
  return Array.from({ length: waypointCount }, (_, index) => Math.round(start + step * (index + 0.5)));
}


export function findRoom(rooms:Room[], roomId:string):Room {
  const room = rooms.find((r) => r.id === roomId);
  assertNonNullable(room, `room with id ${roomId} not found`);
  return room;
}

export function findRoomAtPosition(rooms:Room[], x:number, y:number):Room | null {
  return rooms.find((r) => isPositionInRect(x, y, r.rect)) || null;
}

export function findRoomNearestToPosition(rooms:Room[], x:number, y:number):Room {
  assert(rooms.length > 0, 'there should be at least one room in the level');
  let nearestRoom:Room|null = null;
  let nearestDistanceSquared = Infinity;
  for (const room of rooms) {
    const centerX = room.rect.x + room.rect.width / 2;
    const centerY = room.rect.y + room.rect.height / 2;
    const distanceSquared = (centerX - x) ** 2 + (centerY - y) ** 2;
    if (distanceSquared < nearestDistanceSquared) {
      nearestRoom = room;
      nearestDistanceSquared = distanceSquared;
    }
  }
  assertNonNullable(nearestRoom);
  return nearestRoom;
}

export function findCharactersInRoom(room:Room, characters:Character[]):Character[] {
  return characters.filter(character => isPositionInRect(character.x, character.y, room.rect));
}

export function calcRoomsBoundingRect(rooms:Room[]):Rect {
  assert(rooms.length > 0);
  let leftX = rooms[0].rect.x, rightX = leftX + rooms[0].rect.width,
      topY = rooms[0].rect.y, bottomY = topY + rooms[0].rect.height;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    leftX = Math.min(leftX, room.rect.x);
    rightX = Math.max(rightX, room.rect.x + room.rect.width);
    topY = Math.min(topY, room.rect.y);
    bottomY = Math.max(bottomY, room.rect.y + room.rect.height);
  }
  return {x:leftX, y:topY, width:rightX - leftX, height:bottomY - topY};
}

/*
Algorithm for generating waypoints:

Create a grid of waypoints that is evenly spaced to cover a room rectangle. Each waypoint will have 
connections to adjacent waypoints and exits. "Adjacent" in this case means the distance to the 
waypoint or exit is not larger than the hypotenuse of spacing size. (Another way of saying that
from each waypoint it will be possible to travel to closest orthogonal and diagonal neighbors.)

Remove any waypoint that is inside of an obstruction, removing also any adjacentWaypoints that point to this waypoint.

For every remaining waypoint, test that a path is traversible to all .adjacentWaypoints and .adjacentExits without being blocked by an obstruction.

If any room exits are without a connected waypoint, throw an exception.
*/
const WAYPOINT_SPACING = 5;
export function generateWaypoints(roomRect:Rect, exits:RoomExit[], obstructions:Obstruction[]):Waypoint[] {
  const maxAdjacentDistance = Math.hypot(WAYPOINT_SPACING, WAYPOINT_SPACING);
  const xPositions = _calcAxisWaypointPositions(roomRect.x, roomRect.width);
  const yPositions = _calcAxisWaypointPositions(roomRect.y, roomRect.height);
  const waypoints:Waypoint[] = yPositions.flatMap(y => xPositions.map((x):Waypoint => ({
    position: { x, y },
    adjacentWaypoints: [] as Readonly<Waypoint>[],
    adjacentExits: [] as Readonly<RoomExit>[]
  }))).filter(waypoint => !isPositionInObstructions(waypoint.position.x, waypoint.position.y, obstructions));

  waypoints.forEach((waypoint, index) => {
    for (let otherIndex = index + 1; otherIndex < waypoints.length; ++otherIndex) {
      const otherWaypoint = waypoints[otherIndex];
      const distance = Math.hypot(otherWaypoint.position.x - waypoint.position.x, otherWaypoint.position.y - waypoint.position.y);
      if (distance > maxAdjacentDistance) continue;
      if (isPathBlockedByObstructions(waypoint.position, otherWaypoint.position, obstructions)) continue;
      waypoint.adjacentWaypoints.push(otherWaypoint);
      otherWaypoint.adjacentWaypoints.push(waypoint);
    }

    waypoint.adjacentExits.push(...exits.filter(exit => {
      const distance = Math.hypot(exit.x - waypoint.position.x, exit.y - waypoint.position.y);
      return distance <= maxAdjacentDistance && !isPathBlockedByObstructions(waypoint.position, exit, obstructions);
    }));
  });

  const unconnectedExit = exits.find(exit => !waypoints.some(waypoint => waypoint.adjacentExits.includes(exit)));
  if (unconnectedExit) throw new Error(`room exit at (${unconnectedExit.x}, ${unconnectedExit.y}) has no connected waypoint`);

  return waypoints;
}