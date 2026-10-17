/* This file finds valid character room-navigation times from scheduled timeline positions.
   If this file grows beyond 500 lines of code, read the "Refactoring Large Files" section in CONTRIBUTING.md before making changes. */

import Room from "../types/Room";
import Timeline from "../types/Timeline";
import { findRoomAtPosition } from "../roomUtil";
import { findRoomCrossings } from "../roomTraversalUtil";
import { findCharacterPositionAtTime } from "./retrievalUtil";

function _isCharacterInRoomAtTime(timeline:Timeline, rooms:Room[], characterI:number, roomId:string, time:number):boolean {
  if (time < timeline.startTime || time > timeline.endTime) return false;
  const position = findCharacterPositionAtTime(timeline.keyframes, characterI, time);
  return findRoomAtPosition(rooms, position.x, position.y)?.id === roomId;
}

function _chooseCloserTime(time:number, closestTime:number|null, candidateTime:number):number {
  if (closestTime === null) return candidateTime;
  const distance = Math.abs(candidateTime - time);
  const closestDistance = Math.abs(closestTime - time);
  return distance < closestDistance || (distance === closestDistance && candidateTime > closestTime)
    ? candidateTime : closestTime;
}

export function findCharacterRoomTime(timeline:Timeline, rooms:Room[], characterI:number, roomId:string, time:number):number|null {
  // Current occupancy must be interpolated, not inferred from the preceding keyframe's room.
  if (_isCharacterInRoomAtTime(timeline, rooms, characterI, roomId, time)) return time;
  let closestTime:number|null = null;

  // Timeline bounds can fall inside a movement segment or a stationary interval.
  for (const candidateTime of [timeline.startTime, timeline.endTime]) {
    if (_isCharacterInRoomAtTime(timeline, rooms, characterI, roomId, candidateTime)) {
      closestTime = _chooseCloserTime(time, closestTime, candidateTime);
    }
  }

  // Keep in-room keyframe times as candidates alongside crossing samples.
  for (let keyframeI = 0; keyframeI < timeline.keyframes.length; ++keyframeI) {
    const keyframe = timeline.keyframes[keyframeI];
    if (_isCharacterInRoomAtTime(timeline, rooms, characterI, roomId, keyframe.time)) {
      closestTime = _chooseCloserTime(time, closestTime, keyframe.time);
    }
    const followingKeyframe = timeline.keyframes[keyframeI + 1];
    if (!followingKeyframe) continue;
    const crossings = findRoomCrossings(keyframe.characters[characterI].position,
      followingKeyframe.characters[characterI].position, keyframe.time, followingKeyframe.time, rooms);

    // Boundary entry times may belong to the neighboring room, particularly when traveling left.
    for (const crossing of crossings) {
      if (crossing.roomId !== roomId) continue;
      const fromTime = Math.max(crossing.entryTime, timeline.startTime);
      const toTime = Math.min(crossing.exitTime, timeline.endTime);
      if (fromTime > toTime) continue;
      const candidateTime = fromTime + (toTime - fromTime) / 2;
      if (_isCharacterInRoomAtTime(timeline, rooms, characterI, roomId, candidateTime)) {
        closestTime = _chooseCloserTime(time, closestTime, candidateTime);
      }
    }
  }
  return closestTime;
}