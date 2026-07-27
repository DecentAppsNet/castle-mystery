import Position from "@/game/types/Position";
import EditableItineraryKeyframe from "./types/EditableItineraryKeyframe";
import ItineraryKeyframe from "./types/ItineraryKeyframe";
import { assert, assertNonNullable } from "decent-portal";
import { clamp } from "@/common/numberUtil";

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  interpolateAmount = clamp(interpolateAmount, 0, 1);
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const dz = toPosition.z - fromPosition.z;
  return {
    x:fromPosition.x + (interpolateAmount * dx),
    y:fromPosition.y + (interpolateAmount * dy),
    z:fromPosition.z + (interpolateAmount * dz)
  }
}

export function findInterpolatedCharacterPosition(fromKeyframe:ItineraryKeyframe, toKeyframe:EditableItineraryKeyframe, 
    time:number, characterI:number):Position {
  const fromPosition:Position = fromKeyframe.characters[characterI].position;
  const toPosition:Position = toKeyframe.characters[characterI].position!;
  assertNonNullable(toPosition, 'toKeyframe must have .position defined');
  const fromTime = fromKeyframe.time;
  const toTime = toKeyframe.time;
  if (fromTime === toTime) return fromPosition;
  assert(fromTime <= time && toTime >= time);
  assert(fromTime !== toTime);
  const elapsedRatio = (time - toTime) / (toTime - fromTime);
  return _interpolatePosition(fromPosition, toPosition, elapsedRatio);
}