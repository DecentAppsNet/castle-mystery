import { assert } from "decent-portal";

import TimelineKeyframe, { duplicateTimelineKeyframe } from "@/game/types/TimelineKeyframe";
import Position, { arePositionsEqual } from "@/game/types/Position";
import { findInterpolatedCharacterPosition } from "./interpolationUtil";
import CharacterKeyframe, { duplicateCharacterKeyframe } from "@/game/types/CharacterKeyframe";
import RoomKeyframe from "@/game/types/RoomKeyframe";

function _findKeyframeBeforeTimeRecursively(keyframes:TimelineKeyframe[], fromI:number, toI:number, time:number):number {
  assert(toI > fromI);
  const middleI = fromI + Math.floor((toI - fromI) / 2);
  const delta = keyframes[middleI].time - time;
  if (delta === 0) return middleI;
  if (delta < 0) { // middle time is smaller than sought time
    if (middleI === keyframes.length - 1 || keyframes[middleI+1].time > time) return middleI; 
    return _findKeyframeBeforeTimeRecursively(keyframes, middleI+1, toI, time);
  }
  return _findKeyframeBeforeTimeRecursively(keyframes, fromI, middleI, time);
}

function _findKeyframesBeforeAndAfterTime(keyframes:TimelineKeyframe[], time:number):
    {beforeKeyframe:TimelineKeyframe, afterKeyframe:TimelineKeyframe|null} {
  assert(keyframes[0].time <= time);
  const beforeI = _findKeyframeBeforeTimeRecursively(keyframes, 0, keyframes.length, time);
  assert(beforeI >= 0 && beforeI < keyframes.length);
  const beforeKeyframe = keyframes[beforeI];
  const afterKeyframe = beforeKeyframe.time === time || beforeI === keyframes.length-1
      ? null : keyframes[beforeI+1];
  assert(beforeKeyframe.time <= time);
  assert(afterKeyframe === null || afterKeyframe.time >= time);
  return {beforeKeyframe, afterKeyframe};
}

function _areCharacterKeyframePositionsEqual(fromKeyframe:TimelineKeyframe, toKeyframe:TimelineKeyframe, characterI:number):boolean {
  return arePositionsEqual(fromKeyframe.characters[characterI].position, toKeyframe.characters[characterI].position);
}

export function createKeyframeAtTime(keyframes:TimelineKeyframe[], time:number):Readonly<TimelineKeyframe> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  if (!afterKeyframe) return { ...beforeKeyframe, time };

  // Look for characters between the two keyframes that need an interpolated position.
  let betweenKeyframe:TimelineKeyframe|null = null;
  for(let characterI = 0; characterI < beforeKeyframe.characters.length; ++characterI) {
    if (_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)) continue;
    if (!betweenKeyframe) betweenKeyframe = duplicateTimelineKeyframe(beforeKeyframe);
    const interpolatedPosition = findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI);
    betweenKeyframe.characters[characterI].position = interpolatedPosition;
  }

  // Return a keyframe with interpolated positions if it was needed.
  return betweenKeyframe ?? { ...beforeKeyframe, time};
}

export function createCharacterKeyframeAtTime(keyframes:TimelineKeyframe[], characterI:number, 
    time:number):Readonly<CharacterKeyframe> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  if (!afterKeyframe) return beforeKeyframe.characters[characterI];
  if (_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)) return beforeKeyframe.characters[characterI];
  const interpolatedPosition = findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI);
  const betweenCharacterKeyframe = duplicateCharacterKeyframe(beforeKeyframe.characters[characterI]);
  betweenCharacterKeyframe.position = interpolatedPosition;
  return betweenCharacterKeyframe;
}

export function findCharacterPositionAtTime(keyframes:TimelineKeyframe[], characterI:number, time:number):Readonly<Position> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  const beforePosition = beforeKeyframe.characters[characterI].position;
  return afterKeyframe && !_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)
    ? findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI)
    : beforePosition;
}

// Unlike the create*Keyframe() functions, this won't interpolate any values. Use this faster function if
// interpolated values aren't needed.
export function findKeyframeForTime(keyframes:TimelineKeyframe[], time:number):TimelineKeyframe {
  const { beforeKeyframe } = _findKeyframesBeforeAndAfterTime(keyframes, time);
  return beforeKeyframe;
}

export function findRoomKeyframeForTime(keyframes:TimelineKeyframe[], roomI:number, time:number):RoomKeyframe {
  const { beforeKeyframe } = _findKeyframesBeforeAndAfterTime(keyframes, time);
  return beforeKeyframe.rooms[roomI];
}

