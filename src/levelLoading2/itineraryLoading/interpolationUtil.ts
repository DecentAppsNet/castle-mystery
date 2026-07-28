import Position from "@/game/types/Position";
import EditableItineraryKeyframe from "./types/EditableItineraryKeyframe";
import ItineraryKeyframe from "./types/ItineraryKeyframe";
import { assert, assertNonNullable } from "decent-portal";

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const dz = toPosition.z - fromPosition.z;
  return (interpolateAmount >= 1) 
    ? {...toPosition} // Return the exact destination position rather than rely on floating point calcs to get it.
    : {
      x:fromPosition.x + (interpolateAmount * dx),
      y:fromPosition.y + (interpolateAmount * dy),
      z:fromPosition.z + (interpolateAmount * dz)
    };
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
  const elapsedRatio = (time - fromTime) / (toTime - fromTime);
  return _interpolatePosition(fromPosition, toPosition, elapsedRatio);
}