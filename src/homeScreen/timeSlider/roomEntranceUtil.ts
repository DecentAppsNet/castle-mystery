/* This file derives per-character room-entry events from scheduled timeline positions.
  If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import { findRoomIdAtPosition } from "@/game/roomUtil";
import { findRoomCrossings } from "@/game/roomTraversalUtil";
import Room from "@/game/types/Room";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { assertNonNullable } from "decent-portal";
import RoomEntryEvents from "./types/RoomEntryEvents";

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
    const crossings = findRoomCrossings(lastPosition, position, lastTime, time, rooms);
    events.push(...crossings.map(({ roomId, entryTime }) => ({ roomId, time:entryTime })));

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