import { assert, botch } from "decent-portal";
import ItineraryKeyframe, { duplicateItineraryKeyframe } from "./types/ItineraryKeyframe";
import Position, { arePositionsEqual } from "@/game/types/Position";
import { findInterpolatedCharacterPosition } from "./interpolationUtil";
import CharacterKeyframe, { duplicateCharacterKeyframe } from "./types/CharacterKeyframe";
import EditableItinerary from "./types/EditableItinerary";
import RoomKeyframe from "./types/RoomKeyframe";

function _findKeyframeBeforeTimeRecursively(keyframes:ItineraryKeyframe[], fromI:number, toI:number, time:number):number {
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

function _findKeyframesBeforeAndAfterTime(keyframes:ItineraryKeyframe[], time:number):
    {beforeKeyframe:ItineraryKeyframe, afterKeyframe:ItineraryKeyframe|null} {
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

function _areCharacterKeyframePositionsEqual(fromKeyframe:ItineraryKeyframe, toKeyframe:ItineraryKeyframe, characterI:number):boolean {
  return arePositionsEqual(fromKeyframe.characters[characterI].position, toKeyframe.characters[characterI].position);
}

export function createSnapshotAtTime(keyframes:ItineraryKeyframe[], time:number):Readonly<ItineraryKeyframe> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  if (!afterKeyframe) return { ...beforeKeyframe, time };

  // Look for characters between the two keyframes that need an interpolated position.
  let betweenKeyframe:ItineraryKeyframe|null = null;
  for(let characterI = 0; characterI < beforeKeyframe.characters.length; ++characterI) {
    if (_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)) continue;
    if (!betweenKeyframe) betweenKeyframe = duplicateItineraryKeyframe(beforeKeyframe);
    const interpolatedPosition = findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI);
    betweenKeyframe.characters[characterI].position = interpolatedPosition;
  }

  // Return a keyframe with interpolated positions if it was needed.
  return betweenKeyframe ?? { ...beforeKeyframe, time};
}

export function createCharacterSnapshotAtTime(keyframes:ItineraryKeyframe[], characterI:number, 
    time:number):Readonly<CharacterKeyframe> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  if (!afterKeyframe) return beforeKeyframe.characters[characterI];
  if (_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)) return beforeKeyframe.characters[characterI];
  const interpolatedPosition = findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI);
  const betweenCharacterKeyframe = duplicateCharacterKeyframe(beforeKeyframe.characters[characterI]);
  betweenCharacterKeyframe.position = interpolatedPosition;
  return betweenCharacterKeyframe;
}

export function findCharacterPositionAtTime(keyframes:ItineraryKeyframe[], characterI:number, time:number):Readonly<Position> {
  const {beforeKeyframe, afterKeyframe} = _findKeyframesBeforeAndAfterTime(keyframes, time);
  const beforePosition = beforeKeyframe.characters[characterI].position;
  return afterKeyframe && !_areCharacterKeyframePositionsEqual(beforeKeyframe, afterKeyframe, characterI)
    ? findInterpolatedCharacterPosition(beforeKeyframe, afterKeyframe, time, characterI)
    : beforePosition;
}

// Unlike the create*Snapshot() functions, this won't interpolate any values. Use this faster function if
// interpolated values aren't needed.
export function findKeyframeForTime(keyframes:ItineraryKeyframe[], time:number):ItineraryKeyframe {
  const { beforeKeyframe } = _findKeyframesBeforeAndAfterTime(keyframes, time);
  return beforeKeyframe;
}

function _isEmptyKeyframe(keyframe:Partial<CharacterKeyframe>|Partial<RoomKeyframe>):boolean {
  for (const key in keyframe) {
    if (Object.hasOwn(keyframe, key)) return false;
  }
  return true;
}

export function findLatestKeyFrameForCharacter(itinerary:EditableItinerary, characterRef:string|number):ItineraryKeyframe {
  const characterI:number = typeof characterRef === 'string' ? itinerary.characterIdToI[characterRef] : characterRef;
  assert(itinerary.keyframes.length === itinerary.editableKeyframes.length);
  for(let i = itinerary.editableKeyframes.length - 1; i >= 0; --i) {
    if (!_isEmptyKeyframe(itinerary.editableKeyframes[i].characters[characterI])) 
      return itinerary.keyframes[i];
  }
  botch('There should at least be a first editable keyframe that includes all keys.');
}