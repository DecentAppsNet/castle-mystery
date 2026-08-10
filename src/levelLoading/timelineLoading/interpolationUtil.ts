import Position from "@/game/types/Position";
import EditableTimelineKeyframe from "./types/EditableTimelineKeyframe";
import TimelineKeyframe from "@/game/types/TimelineKeyframe";
import { assert, assertNonNullable } from "decent-portal";

function _interpolatePosition(fromPosition:Position, toPosition:Position, interpolateAmount:number):Position {
  if (interpolateAmount <= 0) return {...fromPosition};
  if (interpolateAmount >= 1) return {...toPosition};
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const dz = toPosition.z - fromPosition.z;
  return {
    x:fromPosition.x + (interpolateAmount * dx),
    y:fromPosition.y + (interpolateAmount * dy),
    z:fromPosition.z + (interpolateAmount * dz)
  };
}

export function findInterpolatedCharacterPosition(fromKeyframe:TimelineKeyframe, toKeyframe:EditableTimelineKeyframe, 
    time:number, characterI:number):Position {
  const fromPosition:Position = fromKeyframe.characters[characterI].position;
  const toPosition:Position = toKeyframe.characters[characterI].position!;
  assertNonNullable(toPosition, 'toKeyframe must have .position defined');
  const fromTime = fromKeyframe.time;
  const toTime = toKeyframe.time;
  if (fromTime === toTime) return {...fromPosition};
  assert(fromTime <= time && toTime >= time);
  assert(fromTime !== toTime);
  const elapsedRatio = (time - fromTime) / (toTime - fromTime);
  return _interpolatePosition(fromPosition, toPosition, elapsedRatio);
}